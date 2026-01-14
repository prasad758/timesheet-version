/**
 * Check Profile Table Columns
 * Verifies which columns exist in the profiles table
 */

import pool from './db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

const checkColumns = async () => {
  try {
    console.log('🔍 Checking erp.profiles table columns...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'erp' 
      AND table_name = 'profiles'
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Profiles table does not exist!');
      return;
    }
    
    console.log(`✅ Found ${result.rows.length} columns in erp.profiles:\n`);
    result.rows.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
    });
    
    // Check for required columns
    const requiredColumns = [
      'id', 'phone', 'skills', 'join_date', 'experience_years',
      'previous_projects', 'bio', 'linkedin_url', 'github_url',
      'job_title', 'department', 'employment_type'
    ];
    
    console.log('\n📋 Checking required columns:');
    const existingColumns = result.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist!');
    } else {
      console.log('❌ Missing columns:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n💡 Run the migration scripts:');
      console.log('   1. node run-profile-migration.js (for extended fields)');
      console.log('   2. Or run add-profile-fields.sql manually');
    }
    
  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
  } finally {
    await pool.end();
  }
};

checkColumns();

