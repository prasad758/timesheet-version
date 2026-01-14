/**
 * Check Database Schema
 * Lists all tables in the erp schema
 */

import pool from './db/connection.js';

const checkSchema = async () => {
  try {
    console.log('🔍 Checking current database schema...');
    
    // Check if erp schema exists
    const schemaResult = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'erp'
    `);
    
    if (schemaResult.rows.length === 0) {
      console.log('❌ ERP schema does not exist');
      return;
    }
    
    console.log('✅ ERP schema exists');
    
    // List all tables in erp schema
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'erp'
      ORDER BY table_name
    `);
    
    console.log('📊 Tables in erp schema:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check for specific tables we need
    const requiredTables = ['issues', 'gitlab_issues', 'gitlab_projects'];
    for (const table of requiredTables) {
      const tableExists = tablesResult.rows.some(row => row.table_name === table);
      console.log(`   ${table}: ${tableExists ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    await pool.end();
  }
};

checkSchema();