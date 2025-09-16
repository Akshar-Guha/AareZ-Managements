import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../.env') });

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Test the connection
    console.log('Attempting to connect to database...');
    const client = await pool.connect();
    console.log('Successfully connected to database!');

    // Test query to check for admin user
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@aarezhealth.com']
    );

    if (result.rows.length > 0) {
      console.log('Admin user found:', result.rows[0]);
    } else {
      console.log('Admin user not found in database');
    }

    client.release();
  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
