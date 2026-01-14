/**
 * PostgreSQL Database Connection
 * Uses connection pooling for better performance
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer backend/configs/.env for local development, then fall back to other locations
const envPaths = [
  path.resolve(__dirname, '../../configs/.env'), // backend/configs/.env
  path.resolve(__dirname, '../../../configs/.env'), // project-root configs/.env
  path.resolve(__dirname, '../../.env'), // backend/.env
  path.resolve(__dirname, '../../../.env'), // project-root .env
];

for (const p of envPaths) {
  try {
    dotenv.config({ path: p });
    if (process.env.POSTGRES_HOST || process.env.DB_HOST) break;
  } catch (e) {
    // continue trying other paths
  }
}

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || '143.110.249.144',
  port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'salesmaya_agent',
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'techiemaya',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 30000, // Return an error after 30 seconds if connection cannot be established
});

// Set default search path to ERP schema
pool.on('connect', async (client) => {
  await client.query('SET search_path TO erp, public');
});

// Test connection
pool.on('error', (err) => {
  console.error('⚠️  Database connection error:', err.message);
  console.error('   The server will continue running, but database operations may fail.');
  // Don't exit - let the server continue running
  // Individual route handlers should handle database errors gracefully
});

// Test connection on startup (non-blocking)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Server will continue, but database features may not work.');
    console.error('   Check your database configuration in .env file or connection.js');
  } else {
    console.log('✅ Database connected successfully');
  }
});

export default pool;

