import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function testQuery() {
  try {
    const userId = 'bb3d7f11-5e51-40dd-9766-e76cd8a1bfbd'; // chethan
    const weekStart = '2025-11-03';
    const weekEnd = '2025-11-09';
    
    console.log('Testing timesheet query...');
    console.log('User ID:', userId);
    console.log('Week:', weekStart, 'to', weekEnd);
    console.log('\n');
    
    const query = `
      SELECT 
        t.id,
        t.week_start,
        t.week_end,
        COUNT(te.id) as entry_count
      FROM erp.timesheets t
      LEFT JOIN erp.timesheet_entries te ON t.id = te.timesheet_id
      WHERE t.user_id = $1
      AND (
        CAST(t.week_start AS DATE) = CAST($2 AS DATE) OR
        (CAST(t.week_start AS DATE) <= CAST($3 AS DATE) AND CAST(t.week_end AS DATE) >= CAST($2 AS DATE))
      )
      GROUP BY t.id, t.week_start, t.week_end
      ORDER BY t.week_start DESC
    `;
    
    const result = await pool.query(query, [userId, weekStart, weekEnd]);
    
    console.log('Found timesheets:', result.rows.length);
    console.log('\n');
    
    for (const row of result.rows) {
      console.log(`Timesheet: ${row.id}`);
      console.log(`  Week: ${row.week_start} to ${row.week_end}`);
      console.log(`  Entry count from JOIN: ${row.entry_count}`);
      
      // Check entries directly
      const directCheck = await pool.query(
        `SELECT COUNT(*) as count FROM erp.timesheet_entries WHERE timesheet_id = $1`,
        [row.id]
      );
      const directCount = parseInt(directCheck.rows[0].count);
      console.log(`  Entry count from direct query: ${directCount}`);
      
      if (directCount > 0) {
        const entries = await pool.query(
          `SELECT id, project, task, thu_hours, fri_hours, source 
           FROM erp.timesheet_entries WHERE timesheet_id = $1`,
          [row.id]
        );
        entries.rows.forEach((e, idx) => {
          console.log(`    Entry ${idx + 1}: ${e.project}/${e.task} - Thu: ${e.thu_hours}, Fri: ${e.fri_hours}`);
        });
      }
      console.log('\n');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testQuery();

