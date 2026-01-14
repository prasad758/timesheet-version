/**
 * Check time_clock entries and their corresponding timesheet entries
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkTimeClockEntries() {
  try {
    console.log('\n🔍 Checking time_clock entries...\n');

    // Get recent clock-out entries
    const clockOuts = await pool.query(
      `SELECT id, user_id, issue_id, project_name, clock_in, clock_out, total_hours, status
       FROM erp.time_clock
       WHERE status = 'clocked_out' AND clock_out IS NOT NULL
       ORDER BY clock_out DESC
       LIMIT 20`
    );

    console.log(`Found ${clockOuts.rows.length} recent clock-out entries\n`);

    for (const entry of clockOuts.rows) {
      const clockOutDate = new Date(entry.clock_out);
      const localDateStr = clockOutDate.toLocaleDateString('en-CA');
      const [year, month, day] = localDateStr.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const dayOfWeek = localDate.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(localDate);
      weekStart.setDate(weekStart.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

      console.log(`\n⏰ Clock-out Entry: ${entry.id}`);
      console.log(`   User: ${entry.user_id}`);
      console.log(`   Clock out: ${entry.clock_out}`);
      console.log(`   Hours: ${entry.total_hours}`);
      console.log(`   Project: ${entry.project_name || 'General'}`);
      console.log(`   Calculated week_start: ${weekStartStr}`);

      // Check if timesheet exists for this week
      const timesheet = await pool.query(
        `SELECT id FROM erp.timesheets
         WHERE user_id = $1 AND CAST(week_start AS DATE) = CAST($2 AS DATE)`,
        [entry.user_id, weekStartStr]
      );

      if (timesheet.rows.length > 0) {
        const tsId = timesheet.rows[0].id;
        console.log(`   ✅ Timesheet found: ${tsId}`);

        // Check for entries in this timesheet
        const timesheetEntries = await pool.query(
          `SELECT id, project, task, source, ${['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][dayOfWeek]}_hours as day_hours
           FROM erp.timesheet_entries
           WHERE timesheet_id = $1 AND source = 'time_clock'`,
          [tsId]
        );

        console.log(`   Entries in timesheet: ${timesheetEntries.rows.length}`);
        if (timesheetEntries.rows.length > 0) {
          timesheetEntries.rows.forEach(e => {
            console.log(`     - ${e.project} / ${e.task}: ${e.day_hours} hours`);
          });
        } else {
          console.log(`   ⚠️ NO ENTRIES FOUND in timesheet ${tsId} for this clock-out!`);
        }
      } else {
        console.log(`   ❌ No timesheet found for week ${weekStartStr}`);
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

checkTimeClockEntries();

