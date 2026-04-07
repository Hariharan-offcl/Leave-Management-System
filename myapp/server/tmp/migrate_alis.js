const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateALIS() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_leave_system'
  });

  try {
    console.log('🚀 Starting ALIS Database Migration...\n');

    // ─── 1. Departments Table ───
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ departments table created.');

    // Seed default departments
    const depts = ['AIML', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'Administration'];
    for (const d of depts) {
      await connection.execute('INSERT IGNORE INTO departments (name) VALUES (?)', [d]);
    }
    console.log('✅ Default departments seeded:', depts.join(', '));

    // ─── 2. Add department_id to users ───
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN department_id INT NULL');
      console.log('✅ department_id column added to users.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  department_id already exists on users.');
      } else throw e;
    }

    // Add FK constraint (safe attempt)
    try {
      await connection.execute('ALTER TABLE users ADD CONSTRAINT fk_user_dept FOREIGN KEY (department_id) REFERENCES departments(id)');
      console.log('✅ FK constraint fk_user_dept added.');
    } catch (e) {
      console.log('ℹ️  FK constraint may already exist.');
    }

    // Migrate existing text department → department_id
    const [migrated] = await connection.execute(`
      UPDATE users u 
      JOIN departments d ON LOWER(u.department) = LOWER(d.name) 
      SET u.department_id = d.id 
      WHERE u.department_id IS NULL AND u.department IS NOT NULL
    `);
    console.log(`✅ Migrated ${migrated.affectedRows} users from text department to department_id.`);

    // ─── 3. Add is_active to users ───
    try {
      await connection.execute('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE');
      console.log('✅ is_active column added to users.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  is_active already exists on users.');
      } else throw e;
    }

    // ─── 4. Approvals Table ───
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS approvals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leave_id INT NOT NULL,
        approver_id INT NOT NULL,
        stage VARCHAR(30) NOT NULL,
        status ENUM('APPROVED','REJECTED','FORWARDED') NOT NULL,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
        FOREIGN KEY (approver_id) REFERENCES users(id)
      )
    `);
    console.log('✅ approvals table created.');

    // ─── 5. AI Scores Table ───
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leave_id INT NOT NULL,
        priority_score DECIMAL(5,2) DEFAULT 0,
        impact_score DECIMAL(5,2) DEFAULT 0,
        risk_score DECIMAL(5,2) DEFAULT 0,
        explanation JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
        UNIQUE KEY unique_leave (leave_id)
      )
    `);
    console.log('✅ ai_scores table created.');

    // ─── 6. Audit Logs Table ───
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        user_id INT,
        details JSON,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ audit_logs table created.');

    // ─── 7. Badges Table ───
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS badges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        badge_type VARCHAR(50) NOT NULL,
        badge_name VARCHAR(100) NOT NULL,
        description TEXT,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_badge (user_id, badge_type)
      )
    `);
    console.log('✅ badges table created.');

    // ─── 8. Extend leaves status ENUM ───
    try {
      await connection.execute(`
        ALTER TABLE leaves 
        MODIFY COLUMN status ENUM('PENDING','APPROVED','REJECTED','RISKY','PENDING_STAFF','PENDING_HOD','PENDING_PRINCIPAL','ESCALATED') 
        DEFAULT 'PENDING'
      `);
      console.log('✅ leaves.status ENUM extended with ESCALATED.');
    } catch (e) {
      console.log('ℹ️  leaves.status may already have the new values.');
    }

    // ─── 9. Add department_id to leaves for faster queries ───
    try {
      await connection.execute('ALTER TABLE leaves ADD COLUMN department_id INT NULL');
      await connection.execute('ALTER TABLE leaves ADD CONSTRAINT fk_leave_dept FOREIGN KEY (department_id) REFERENCES departments(id)');
      console.log('✅ department_id added to leaves table.');
    } catch (e) {
      console.log('ℹ️  department_id may already exist on leaves.');
    }

    // Backfill department_id on existing leaves
    const [backfilled] = await connection.execute(`
      UPDATE leaves l 
      JOIN users u ON l.user_id = u.id 
      SET l.department_id = u.department_id 
      WHERE l.department_id IS NULL AND u.department_id IS NOT NULL
    `);
    console.log(`✅ Backfilled ${backfilled.affectedRows} leaves with department_id.`);

    console.log('\n🎉 ALIS Migration Complete! All tables ready.');

  } catch (err) {
    console.error('❌ ALIS Migration failed:', err);
  } finally {
    await connection.end();
  }
}

migrateALIS();
