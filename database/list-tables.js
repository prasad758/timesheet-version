/**
 * Simple script to list all table names in ERP schema
 * Run: node database/list-tables.js
 */

import pg from 'pg';

const { Client } = pg;

const config = {
  host: '143.110.249.144',
  port: 5432,
  database: 'salesmaya_agent',
  user: 'postgres',
  password: 'techiemaya',
  ssl: { rejectUnauthorized: false },
};

async function listTables() {
  const client = new Client(config);
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'erp'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in ERP schema:\n');
    result.rows.forEach((row, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${row.table_name}`);
    });
    
    console.log(`\nTotal: ${result.rows.length} tables\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

listTables();

