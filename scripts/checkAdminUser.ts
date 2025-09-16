import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAdminUser() {
  const email = 'admin@aarezhealth.com';
  try {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rows.length > 0) {
      console.log('Admin user exists:', res.rows[0]);
    } else {
      console.log('Admin user does NOT exist.');
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

checkAdminUser();
