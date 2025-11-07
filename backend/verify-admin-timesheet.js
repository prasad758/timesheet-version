/**
 * Verify admin timesheet query returns entries correctly
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyAdminTimesheet() {
  try {
    console.log('🔍 Verifying admin timesheet query...\n');

    // Get satwik's user ID
    const userResult = await pool.query(
      `SELECT id FROM erp.users WHERE email = 'satwik.k@techiemaya.com' LIMIT 1`
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

    // Query exactly as the backend does
    const query = `
      SELECT 
        t.id,
        t.user_id,
        t.week_start,
        t.week_end,
        t.status,
        t.created_at,
        t.updated_at,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', te.id,
              'project', COALESCE(te.project, ''),
              'task', COALESCE(te.task, ''),
              'mon_hours', COALESCE(te.mon_hours, 0),
              'tue_hours', COALESCE(te.tue_hours, 0),
              'wed_hours', COALESCE(te.wed_hours, 0),
              'thu_hours', COALESCE(te.thu_hours, 0),
              'fri_hours', COALESCE(te.fri_hours, 0),
              'sat_hours', COALESCE(te.sat_hours, 0),
              'sun_hours', COALESCE(te.sun_hours, 0),
              'source', COALESCE(te.source, 'manual')
            ) ORDER BY te.created_at ASC
          ) FILTER (WHERE te.id IS NOT NULL),
          '[]'::json
        ) as entries
      FROM erp.timesheets t
      LEFT JOIN erp.timesheet_entries te ON t.id = te.timesheet_id
      WHERE t.user_id = $1
      AND (
        CAST(t.week_start AS DATE) = CAST($2 AS DATE) OR
        (CAST(t.week_start AS DATE) <= CAST($2 AS DATE) AND CAST(t.week_end AS DATE) >= CAST($2 AS DATE))
      )
      GROUP BY t.id
      ORDER BY t.week_start DESC
    `;

    const result = await pool.query(query, [userId, weekStart]);
    
    console.log('📊 Query Results:');
    console.log('Found timesheets:', result.rows.length);
    console.log('\n');
    
    for (const row of result.rows) {
      console.log(`📋 Timesheet:`);
      console.log('  ID:', row.id);
      console.log('  User ID:', row.user_id);
      console.log('  Week Start:', row.week_start);
      console.log('  Week End:', row.week_end);
      console.log('  Entries type:', typeof row.entries);
      console.log('  Entries is array:', Array.isArray(row.entries));
      
      let entries = row.entries || [];
      if (typeof entries === 'string') {
        try {
          entries = JSON.parse(entries);
          console.log('  ✅ Parsed entries from JSON string');
        } catch (e) {
          console.log('  ❌ Error parsing JSON:', e.message);
          entries = [];
        }
      }
      
      if (!Array.isArray(entries)) {
        console.log('  ⚠️ Entries is not an array:', typeof entries);
        entries = [];
      }
      
      console.log('  Entries count:', entries.length);
      console.log('\n');
      
      if (entries.length > 0) {
        entries.forEach((e, eIdx) => {
          const total = (parseFloat(e.mon_hours) || 0) + (parseFloat(e.tue_hours) || 0) + 
                       (parseFloat(e.wed_hours) || 0) + (parseFloat(e.thu_hours) || 0) + 
                       (parseFloat(e.fri_hours) || 0) + (parseFloat(e.sat_hours) || 0) + 
                       (parseFloat(e.sun_hours) || 0);
          console.log(`  Entry ${eIdx + 1}:`);
          console.log('    ID:', e.id);
          console.log('    Project:', e.project);
          console.log('    Task:', e.task);
          console.log('    Source:', e.source);
          console.log('    Hours:', {
            mon: e.mon_hours,
            tue: e.tue_hours,
            wed: e.wed_hours,
            thu: e.thu_hours,
            fri: e.fri_hours,
            sat: e.sat_hours,
            sun: e.sun_hours
          });
          console.log('    Total:', total);
          console.log('\n');
        });
      } else {
        console.log('  ⚠️ No entries found in JSON response!');
        console.log(`  🔍 Checking entries directly for timesheet ${row.id}:`);
        const entriesCheck = await pool.query(
          `SELECT id, project, task, mon_hours, tue_hours, wed_hours, thu_hours, fri_hours, sat_hours, sun_hours, source 
           FROM erp.timesheet_entries 
           WHERE timesheet_id = $1`,
          [row.id]
        );
        console.log('  Found entries:', entriesCheck.rows.length);
        if (entriesCheck.rows.length > 0) {
          entriesCheck.rows.forEach((e, idx) => {
            const total = (parseFloat(e.mon_hours) || 0) + (parseFloat(e.tue_hours) || 0) + 
                         (parseFloat(e.wed_hours) || 0) + (parseFloat(e.thu_hours) || 0) + 
                         (parseFloat(e.fri_hours) || 0) + (parseFloat(e.sat_hours) || 0) + 
                         (parseFloat(e.sun_hours) || 0);
            console.log(`  Entry ${idx + 1}: ${e.project}/${e.task} - Total: ${total}`, {
              thu: e.thu_hours,
              fri: e.fri_hours,
              source: e.source
            });
          });
        }
        console.log('\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verifyAdminTimesheet();

