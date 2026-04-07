const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_leave_system'
  });

  try {
    console.log('🏗️ Starting Multi-Stage Migration...');

    // 1. Alter Enum for leaves.status
    // Note: In MySQL, we need to list the entire new set of values.
    await connection.execute(`
      ALTER TABLE leaves 
      MODIFY COLUMN status ENUM('PENDING', 'APPROVED', 'REJECTED', 'RISKY', 'PENDING_STAFF', 'PENDING_HOD', 'PENDING_PRINCIPAL') 
      DEFAULT 'PENDING'
    `);

    console.log('✅ Migration Successful. Status stages added.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await connection.end();
  }
}

migrate();
