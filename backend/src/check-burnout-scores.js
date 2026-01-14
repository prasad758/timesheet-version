/**
 * Check burnout scores in profiles table
 */

import pool from '../shared/database/connection.js';

async function checkBurnoutScores() {
  try {
    console.log('🔍 Checking burnout_score data in profiles table...\n');

    const result = await pool.query(`
      SELECT
        u.full_name,
        u.email,
        p.burnout_score,
        CASE
          WHEN p.burnout_score IS NULL THEN 'Not Set'
          WHEN p.burnout_score <= 30 THEN 'Low Risk'
          WHEN p.burnout_score <= 60 THEN 'Moderate Risk'
          WHEN p.burnout_score <= 80 THEN 'High Risk'
          ELSE 'Critical Risk'
        END as risk_level
      FROM erp.users u
      LEFT JOIN erp.profiles p ON u.id = p.id
      ORDER BY p.burnout_score DESC NULLS LAST
    `);

    console.log(`📊 Found ${result.rows.length} profiles:\n`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.full_name || row.email}`);
      console.log(`   Burnout Score: ${row.burnout_score !== null ? row.burnout_score : 'NULL'}`);
      console.log(`   Risk Level: ${row.risk_level}`);
      console.log('');
    });

    // Summary
    const withScores = result.rows.filter(r => r.burnout_score !== null).length;
    const withoutScores = result.rows.filter(r => r.burnout_score === null).length;

    console.log('📈 Summary:');
    console.log(`   Profiles with burnout scores: ${withScores}`);
    console.log(`   Profiles without burnout scores: ${withoutScores}`);

  } catch (error) {
    console.error('❌ Error checking burnout scores:', error);
  } finally {
    await pool.end();
  }
}

checkBurnoutScores();
