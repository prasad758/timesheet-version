/**
 * Check if user exists in database
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '143.110.249.144',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'techiemaya',
  database: process.env.POSTGRES_DB || 'salesmaya_agent',
  ssl: { rejectUnauthorized: false },
});

const email = process.argv[2] || 'prasad.d@techiemaya.com';

pool.query(
  `SELECT u.id, u.email, u.full_name, u.password_hash IS NOT NULL as has_password,
          ur.role
   FROM erp.users u
   LEFT JOIN erp.user_roles ur ON u.id = ur.user_id
   WHERE u.email = $1`,
  [email]
)
  .then((result) => {
    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
    } else {
      const user = result.rows[0];
      console.log('✅ User found:');
      console.log('   ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   Full Name:', user.full_name);
      console.log('   Has Password:', user.has_password);
      console.log('   Role:', user.role || 'user');
    }
    pool.end();
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    pool.end();
  });

