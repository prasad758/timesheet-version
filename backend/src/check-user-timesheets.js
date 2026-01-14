/**
 * Diagnostic script to check timesheet data for specific users
 * Helps identify why timesheets aren't showing correctly
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserTimesheets() {
  try {
    console.log('\n🔍 Checking timesheet data for users...\n');

    // Get all users
    const users = await pool.query('SELECT id, email FROM erp.users ORDER BY email');
    console.log(`Found ${users.rows.length} user(s)\n`);

    const weekStart = '2025-11-03'; // Current week Monday

    for (const user of users.rows) {
      console.log(`\n👤 User: ${user.email} (${user.id})`);
      console.log('─'.repeat(60));

      // Check timesheet for current week
      const timesheet = await pool.query(
        `SELECT id, week_start, week_end, status, created_at
         FROM erp.timesheets
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)
         LIMIT 1`,
        [user.id, weekStart]
      );

      if (timesheet.rows.length > 0) {
        const ts = timesheet.rows[0];
        console.log(`✅ Timesheet found: ${ts.id}`);
        console.log(`   Week: ${ts.week_start} to ${ts.week_end}`);

        // Get all entries
        const entries = await pool.query(
          `SELECT id, project, task, source,
                  mon_hours, tue_hours, wed_hours, thu_hours,
                  fri_hours, sat_hours, sun_hours,
                  created_at
           FROM erp.timesheet_entries
           WHERE timesheet_id = $1
           ORDER BY created_at ASC`,
          [ts.id]
        );

        console.log(`   Entries: ${entries.rows.length}`);
        
        if (entries.rows.length > 0) {
          entries.rows.forEach((e, idx) => {
            const total = (parseFloat(e.mon_hours) || 0) + 
                         (parseFloat(e.tue_hours) || 0) + 
                         (parseFloat(e.wed_hours) || 0) + 
                         (parseFloat(e.thu_hours) || 0) + 
                         (parseFloat(e.fri_hours) || 0) + 
                         (parseFloat(e.sat_hours) || 0) + 
                         (parseFloat(e.sun_hours) || 0);
            console.log(`   Entry ${idx + 1}:`, {
              id: e.id,
              project: e.project,
              task: e.task,
              source: e.source,
              hours: {
                mon: e.mon_hours,
                tue: e.tue_hours,
                wed: e.wed_hours,
                thu: e.thu_hours,
                fri: e.fri_hours,
                sat: e.sat_hours,
                sun: e.sun_hours
              },
              total,
              created: e.created_at
            });
          });
        } else {
          console.log('   ⚠️ No entries found in timesheet');
        }

        // Check time_clock entries specifically
        const timeClockEntries = entries.rows.filter(e => e.source === 'time_clock');
        console.log(`   Time Clock Entries: ${timeClockEntries.length}`);
        if (timeClockEntries.length > 0) {
          timeClockEntries.forEach((e, idx) => {
            console.log(`     TC ${idx + 1}: ${e.project} / ${e.task} - Total: ${(parseFloat(e.mon_hours) || 0) + (parseFloat(e.tue_hours) || 0) + (parseFloat(e.wed_hours) || 0) + (parseFloat(e.thu_hours) || 0) + (parseFloat(e.fri_hours) || 0) + (parseFloat(e.sat_hours) || 0) + (parseFloat(e.sun_hours) || 0)}`);
          });
        }
      } else {
        console.log(`❌ No timesheet found for week ${weekStart}`);
        
        // Check if there are any timesheets for this user
        const allTimesheets = await pool.query(
          `SELECT id, week_start, week_end FROM erp.timesheets
           WHERE user_id = $1
           ORDER BY week_start DESC
           LIMIT 5`,
          [user.id]
        );
        
        if (allTimesheets.rows.length > 0) {
          console.log(`   Found ${allTimesheets.rows.length} timesheet(s) for other weeks:`);
          allTimesheets.rows.forEach(ts => {
            console.log(`     - Week ${ts.week_start} to ${ts.week_end} (ID: ${ts.id})`);
          });
        } else {
          console.log(`   ⚠️ No timesheets found for this user at all`);
        }
      }
    }

    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkUserTimesheets();

