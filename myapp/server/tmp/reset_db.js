const mysql = require('mysql2/promise');
require('dotenv').config();

async function reset() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_leave_system'
  });

  try {
    console.log('🧹 Starting Database Reset...');

    // 1. Find the Principal
    const [rows] = await connection.execute('SELECT id FROM users WHERE role = "PRINCIPAL" ORDER BY id ASC LIMIT 1');
    if (rows.length === 0) {
      console.log('❌ No Principal found. Reset aborted.');
      return;
    }
    const principalId = rows[0].id;

    // 2. Disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // 3. Clear tables
    await connection.execute('DELETE FROM leaves');
    await connection.execute('DELETE FROM teams');
    await connection.execute('DELETE FROM leave_inventory WHERE user_id != ?', [principalId]);
    await connection.execute('DELETE FROM users WHERE id != ?', [principalId]);

    // 4. Enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✅ System Reset Successful. Only Principal ID ' + principalId + ' remains.');
  } catch (err) {
    console.error('❌ Reset failed:', err);
  } finally {
    await connection.end();
  }
}

reset();
