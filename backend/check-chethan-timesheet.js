import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkChethanTimesheet() {
  try {
    const userResult = await pool.query(
      `SELECT id FROM erp.users WHERE email = 'chethan.p@techiemaya.com' LIMIT 1`
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    const weekStart = '2025-11-03';
    
    console.log('👤 User ID:', userId);
    console.log('📅 Week start:', weekStart);
    console.log('\n');

    // Check timesheets
    const timesheetResult = await pool.query(
      `SELECT id, week_start, week_end FROM erp.timesheets 
       WHERE user_id = $1 
       AND (CAST(week_start AS DATE) = CAST($2 AS DATE) OR 
            (CAST(week_start AS DATE) <= CAST($2 AS DATE) AND CAST(week_end AS DATE) >= CAST($2 AS DATE)))
       ORDER BY week_start DESC`,
      [userId, weekStart]
    );
    
    console.log('📊 Timesheets found:', timesheetResult.rows.length);
    
    for (const ts of timesheetResult.rows) {
      console.log(`\n📋 Timesheet: ${ts.id}`);
      console.log(`   Week: ${ts.week_start} to ${ts.week_end}`);
      
      const entriesResult = await pool.query(
        `SELECT id, project, task, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, source
         FROM erp.timesheet_entries 
         WHERE timesheet_id = $1`,
        [ts.id]
      );
      
      console.log(`   Entries: ${entriesResult.rows.length}`);
      
      entriesResult.rows.forEach((e, idx) => {
        const total = (parseFloat(e.mon_hours) || 0) + (parseFloat(e.tue_hours) || 0) + 
                     (parseFloat(e.wed_hours) || 0) + (parseFloat(e.thu_hours) || 0) + 
                     (parseFloat(e.fri_hours) || 0) + (parseFloat(e.sat_hours) || 0) + 
                     (parseFloat(e.sun_hours) || 0);
        console.log(`     Entry ${idx + 1}: ${e.project}/${e.task}`);
        console.log(`       Source: ${e.source}`);
        console.log(`       Hours: Thu=${e.thu_hours}, Fri=${e.fri_hours}`);
        console.log(`       Total: ${total}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkChethanTimesheet();

