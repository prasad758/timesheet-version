import pool from './shared/database/connection.js';
import dotenv from 'dotenv';

dotenv.config();

async function testProfiles() {
  try {
    console.log('Testing profiles query...');

    const result = await pool.query('SELECT COUNT(*) as count FROM erp.profiles');
    console.log('Profiles count:', result.rows[0].count);

    const profiles = await pool.query('SELECT * FROM erp.profiles LIMIT 2');
    console.log('Raw profiles:', JSON.stringify(profiles.rows, null, 2));

    const users = await pool.query('SELECT id, email, full_name FROM erp.users LIMIT 5');
    console.log('Sample users:', users.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

testProfiles();