import pool from './shared/database/connection.js';

async function addSessionColumn() {
  try {
    await pool.query(`
      ALTER TABLE erp.leave_requests 
      ADD COLUMN IF NOT EXISTS session VARCHAR(20) DEFAULT 'Full Day'
    `);
    console.log('✅ Session column added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addSessionColumn();
