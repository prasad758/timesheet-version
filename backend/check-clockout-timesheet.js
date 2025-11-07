/**
 * Diagnostic script to check if clock-out entries are being saved to timesheets
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkClockOutTimesheet() {
  try {
    console.log('\n🔍 Checking clock-out timesheet entries...\n');

    // Get the most recent clock-out
    const recentClockOut = await pool.query(
      `SELECT 
        tc.id,
        tc.user_id,
        u.email,
        tc.clock_in,
        tc.clock_out,
        tc.total_hours,
        tc.project_name,
        tc.issue_id,
        tc.status,
        tc.created_at,
        tc.updated_at
      FROM erp.time_clock tc
      JOIN erp.users u ON tc.user_id = u.id
      WHERE tc.status = 'clocked_out'
      ORDER BY tc.updated_at DESC
      LIMIT 5`
    );

    console.log(`📊 Found ${recentClockOut.rows.length} recent clock-out(s):\n`);

    for (const clockOut of recentClockOut.rows) {
      console.log(`\n🔍 Clock-out ID: ${clockOut.id}`);
      console.log(`   User: ${clockOut.email} (${clockOut.user_id})`);
      console.log(`   Clock in: ${clockOut.clock_in}`);
      console.log(`   Clock out: ${clockOut.clock_out}`);
      console.log(`   Total hours: ${clockOut.total_hours}`);
      console.log(`   Project: ${clockOut.project_name || 'N/A'}`);
      console.log(`   Issue ID: ${clockOut.issue_id || 'N/A'}`);
      console.log(`   Status: ${clockOut.status}`);
      console.log(`   Updated at: ${clockOut.updated_at}`);

      // Calculate what week this should be in
      const clockOutTime = new Date(clockOut.clock_out);
      const localDateStr = clockOutTime.toLocaleDateString('en-CA');
      const [year, month, day] = localDateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const dayOfWeek = localDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(localDate);
      weekStart.setDate(weekStart.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

      console.log(`\n   📅 Expected week start: ${weekStartStr}`);
      console.log(`   📅 Day of week: ${dayOfWeek} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]})`);

      // Check if timesheet exists for this week
      const timesheet = await pool.query(
        `SELECT id, week_start, week_end, status
         FROM erp.timesheets
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)
         LIMIT 1`,
        [clockOut.user_id, weekStartStr]
      );

      if (timesheet.rows.length > 0) {
        console.log(`   ✅ Timesheet found: ${timesheet.rows[0].id}`);
        console.log(`      Week start: ${timesheet.rows[0].week_start}`);
        console.log(`      Week end: ${timesheet.rows[0].week_end}`);
        console.log(`      Status: ${timesheet.rows[0].status}`);

        // Check for entries in this timesheet
        const entries = await pool.query(
          `SELECT 
            id,
            project,
            task,
            source,
            mon_hours,
            tue_hours,
            wed_hours,
            thu_hours,
            fri_hours,
            sat_hours,
            sun_hours,
            created_at,
            updated_at
          FROM erp.timesheet_entries
          WHERE timesheet_id = $1
          ORDER BY updated_at DESC`,
          [timesheet.rows[0].id]
        );

        console.log(`\n   📋 Found ${entries.rows.length} entry/entries in timesheet:`);
        entries.rows.forEach((entry, idx) => {
          const totalHours = (parseFloat(entry.mon_hours) || 0) +
                           (parseFloat(entry.tue_hours) || 0) +
                           (parseFloat(entry.wed_hours) || 0) +
                           (parseFloat(entry.thu_hours) || 0) +
                           (parseFloat(entry.fri_hours) || 0) +
                           (parseFloat(entry.sat_hours) || 0) +
                           (parseFloat(entry.sun_hours) || 0);
          
          console.log(`\n      Entry ${idx + 1}:`);
          console.log(`         ID: ${entry.id}`);
          console.log(`         Project: ${entry.project}`);
          console.log(`         Task: ${entry.task}`);
          console.log(`         Source: ${entry.source}`);
          console.log(`         Hours: Mon=${entry.mon_hours}, Tue=${entry.tue_hours}, Wed=${entry.wed_hours}, Thu=${entry.thu_hours}, Fri=${entry.fri_hours}, Sat=${entry.sat_hours}, Sun=${entry.sun_hours}`);
          console.log(`         Total: ${totalHours}`);
          console.log(`         Updated: ${entry.updated_at}`);
        });

        // Check if there's a time_clock entry matching this clock-out
        const timeClockEntries = entries.rows.filter(e => e.source === 'time_clock');
        console.log(`\n   ⏰ Time clock entries: ${timeClockEntries.length}`);
        
        if (timeClockEntries.length === 0) {
          console.log(`   ⚠️  WARNING: No time_clock entries found in timesheet!`);
          console.log(`   ⚠️  This clock-out may not have been saved to the timesheet.`);
        }
      } else {
        console.log(`   ❌ No timesheet found for week ${weekStartStr}`);
        console.log(`   ⚠️  This clock-out was NOT saved to a timesheet!`);
      }
    }

    // Also check all timesheets with time_clock entries
    console.log('\n\n📊 All timesheets with time_clock entries:\n');
    const allTimesheets = await pool.query(
      `SELECT 
        t.id,
        t.user_id,
        u.email,
        t.week_start,
        t.week_end,
        COUNT(te.id) as entry_count,
        SUM(te.mon_hours + te.tue_hours + te.wed_hours + te.thu_hours + te.fri_hours + te.sat_hours + te.sun_hours) as total_hours
      FROM erp.timesheets t
      JOIN erp.users u ON t.user_id = u.id
      LEFT JOIN erp.timesheet_entries te ON t.id = te.timesheet_id AND te.source = 'time_clock'
      GROUP BY t.id, t.user_id, u.email, t.week_start, t.week_end
      HAVING COUNT(te.id) > 0
      ORDER BY t.week_start DESC
      LIMIT 10`
    );

    if (allTimesheets.rows.length > 0) {
      allTimesheets.rows.forEach((ts, idx) => {
        console.log(`\nTimesheet ${idx + 1}:`);
        console.log(`   ID: ${ts.id}`);
        console.log(`   User: ${ts.email}`);
        console.log(`   Week: ${ts.week_start} to ${ts.week_end}`);
        console.log(`   Time clock entries: ${ts.entry_count}`);
        console.log(`   Total hours: ${ts.total_hours}`);
      });
    } else {
      console.log('   ⚠️  No timesheets with time_clock entries found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkClockOutTimesheet();

