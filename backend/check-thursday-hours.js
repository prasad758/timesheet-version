/**
 * Check if Thursday hours are being stored in the database
 * Run: node check-thursday-hours.js
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkThursdayHours() {
  try {
    console.log('\n🔍 Checking Thursday hours in database...\n');

    // Get current week start (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    console.log('📅 Current week start (Monday):', weekStartStr);
    console.log('📅 Today:', today.toISOString().split('T')[0]);
    console.log('📅 Day of week:', dayOfWeek, '(0=Sunday, 1=Monday, etc.)\n');

    // Check all timesheet entries with Thursday hours
    const result = await pool.query(
      `SELECT 
        te.id,
        te.timesheet_id,
        te.project,
        te.task,
        te.source,
        te.mon_hours,
        te.tue_hours,
        te.wed_hours,
        te.thu_hours,
        te.fri_hours,
        te.sat_hours,
        te.sun_hours,
        te.created_at,
        te.updated_at,
        t.user_id,
        t.week_start,
        t.week_end,
        u.email
      FROM erp.timesheet_entries te
      JOIN erp.timesheets t ON te.timesheet_id = t.id
      JOIN erp.users u ON t.user_id = u.id
      WHERE CAST(t.week_start AS DATE) = CAST($1 AS DATE)
        AND (te.thu_hours > 0 OR te.source = 'time_clock')
      ORDER BY te.updated_at DESC`,
      [weekStartStr]
    );

    console.log(`✅ Found ${result.rows.length} timesheet entry/entries with Thursday hours or time_clock source:\n`);

    if (result.rows.length === 0) {
      console.log('⚠️  No entries found with Thursday hours for this week.');
      console.log('\nChecking all entries for this week...\n');
      
      const allEntries = await pool.query(
        `SELECT 
          te.id,
          te.project,
          te.task,
          te.source,
          te.mon_hours,
          te.tue_hours,
          te.wed_hours,
          te.thu_hours,
          te.fri_hours,
          te.sat_hours,
          te.sun_hours,
          t.week_start,
          u.email
        FROM erp.timesheet_entries te
        JOIN erp.timesheets t ON te.timesheet_id = t.id
        JOIN erp.users u ON t.user_id = u.id
        WHERE CAST(t.week_start AS DATE) = CAST($1 AS DATE)
        ORDER BY te.updated_at DESC`,
        [weekStartStr]
      );

      if (allEntries.rows.length === 0) {
        console.log('❌ No timesheet entries found for this week at all!');
      } else {
        console.log(`Found ${allEntries.rows.length} total entries for this week:\n`);
        allEntries.rows.forEach((entry, idx) => {
          console.log(`Entry ${idx + 1}:`, {
            id: entry.id,
            project: entry.project,
            task: entry.task,
            source: entry.source,
            hours: {
              mon: entry.mon_hours,
              tue: entry.tue_hours,
              wed: entry.wed_hours,
              thu: entry.thu_hours,
              fri: entry.fri_hours,
              sat: entry.sat_hours,
              sun: entry.sun_hours,
            },
            total: (entry.mon_hours || 0) + (entry.tue_hours || 0) + (entry.wed_hours || 0) + 
                   (entry.thu_hours || 0) + (entry.fri_hours || 0) + (entry.sat_hours || 0) + 
                   (entry.sun_hours || 0),
            user: entry.email,
            week_start: entry.week_start
          });
        });
      }
    } else {
      result.rows.forEach((entry, idx) => {
        console.log(`Entry ${idx + 1}:`, {
          id: entry.id,
          project: entry.project,
          task: entry.task,
          source: entry.source,
          user: entry.email,
          week_start: entry.week_start,
          hours: {
            mon: entry.mon_hours,
            tue: entry.tue_hours,
            wed: entry.wed_hours,
            thu: entry.thu_hours,
            fri: entry.fri_hours,
            sat: entry.sat_hours,
            sun: entry.sun_hours,
          },
          total: (entry.mon_hours || 0) + (entry.tue_hours || 0) + (entry.wed_hours || 0) + 
                 (entry.thu_hours || 0) + (entry.fri_hours || 0) + (entry.sat_hours || 0) + 
                 (entry.sun_hours || 0),
          created_at: entry.created_at,
          updated_at: entry.updated_at
        });
        console.log('');
      });
    }

    // Check recent clock-out entries
    console.log('\n🔍 Checking recent clock-out entries...\n');
    const clockOutResult = await pool.query(
      `SELECT 
        tc.id,
        tc.user_id,
        tc.clock_in,
        tc.clock_out,
        tc.total_hours,
        tc.project_name,
        tc.issue_id,
        u.email,
        DATE(tc.clock_out) as clock_out_date,
        EXTRACT(DOW FROM tc.clock_out) as day_of_week
      FROM erp.time_clock tc
      JOIN erp.users u ON tc.user_id = u.id
      WHERE tc.clock_out IS NOT NULL
        AND tc.clock_out >= NOW() - INTERVAL '7 days'
      ORDER BY tc.clock_out DESC
      LIMIT 10`,
      []
    );

    if (clockOutResult.rows.length > 0) {
      console.log(`Found ${clockOutResult.rows.length} recent clock-out entries:\n`);
      clockOutResult.rows.forEach((entry, idx) => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`Clock-out ${idx + 1}:`, {
          id: entry.id,
          user: entry.email,
          clock_in: entry.clock_in,
          clock_out: entry.clock_out,
          clock_out_date: entry.clock_out_date,
          day_of_week: entry.day_of_week,
          day_name: dayNames[entry.day_of_week],
          total_hours: entry.total_hours,
          project: entry.project_name,
          issue_id: entry.issue_id
        });
        console.log('');
      });
    } else {
      console.log('⚠️  No recent clock-out entries found.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkThursdayHours();

