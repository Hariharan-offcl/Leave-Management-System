const mysql = require('mysql2/promise');
require('dotenv').config();

async function advancedMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_leave_system'
  });

  try {
    console.log('🏗️ Starting Advanced Features Database Migration...');

    // 1. Alter Inventory to support Half Days (Decimal 5,1 allows up to 9999.9)
    await connection.execute('ALTER TABLE leave_inventory MODIFY casual DECIMAL(5,1) DEFAULT 10.0');
    await connection.execute('ALTER TABLE leave_inventory MODIFY sick DECIMAL(5,1) DEFAULT 12.0');
    await connection.execute('ALTER TABLE leave_inventory MODIFY earned DECIMAL(5,1) DEFAULT 15.0');
    await connection.execute('ALTER TABLE leave_inventory MODIFY medical DECIMAL(5,1) DEFAULT 10.0');
    console.log('✅ Inventory converted to Decimal format.');

    // 2. Add New Columns to Leaves Table
    try {
        await connection.execute("ALTER TABLE leaves ADD COLUMN duration_type ENUM('FULL', 'HALF_AM', 'HALF_PM') DEFAULT 'FULL'");
    } catch(e) { console.log('Column duration_type may already exist.'); }
    
    try {
        await connection.execute("ALTER TABLE leaves ADD COLUMN document_url VARCHAR(255) NULL");
    } catch(e) { console.log('Column document_url may already exist.'); }
    
    try {
        await connection.execute("ALTER TABLE leaves ADD COLUMN delegate_id INT NULL");
        await connection.execute("ALTER TABLE leaves ADD CONSTRAINT fk_delegate FOREIGN KEY (delegate_id) REFERENCES users(id) ON DELETE SET NULL");
    } catch(e) { console.log('Column delegate_id may already exist.', e.message); }

    console.log('✅ Advanced columns (Duration, Document URL, Delegate ID) appended to leaves table.');
    console.log('🎉 Migration Complete!');

  } catch (err) {
    console.error('❌ Advanced Migration failed:', err);
  } finally {
    await connection.end();
  }
}

advancedMigration();
