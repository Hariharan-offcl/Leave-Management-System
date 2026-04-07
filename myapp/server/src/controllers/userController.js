const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const { getUserBadges } = require('../services/gamificationService');

exports.getSubordinates = async (req, res) => {
  try {
    // Get subordinates — filtered by manager_id AND same department
    const [rows] = await pool.execute(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE u.manager_id = ?`,
      [req.user.id]
    );
    res.json(rows.map(u => ({ ...u, password: null })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addUser = async (req, res) => {
  const { name, email, password, role, department, department_id } = req.body;
  const manager_id = req.user.id;
  const managerRole = req.user.role;
  const managerDeptId = req.user.department_id;

  // Role creation constraints
  const allowedCreation = {
    'PRINCIPAL': ['HOD'],
    'HOD': ['STAFF'],
    'STAFF': ['STUDENT']
  };

  if (!allowedCreation[managerRole]?.includes(role)) {
    return res.status(403).json({ message: `${managerRole} cannot create ${role} users.` });
  }

  try {
    // Resolve department_id
    let resolvedDeptId = department_id;

    if (managerRole === 'PRINCIPAL' && !resolvedDeptId && department) {
      // Principal can assign any department — look up or create
      const [deptRows] = await pool.execute('SELECT id FROM departments WHERE name = ?', [department]);
      if (deptRows.length > 0) {
        resolvedDeptId = deptRows[0].id;
      } else {
        const [newDept] = await pool.execute('INSERT INTO departments (name) VALUES (?)', [department]);
        resolvedDeptId = newDept.insertId;
      }
    } else if (managerRole !== 'PRINCIPAL') {
      // HOD and Staff: enforce same department
      resolvedDeptId = managerDeptId;
    }

    // Get department name for the text field
    let deptName = department;
    if (resolvedDeptId && !deptName) {
      const [d] = await pool.execute('SELECT name FROM departments WHERE id = ?', [resolvedDeptId]);
      deptName = d[0]?.name || 'Unknown';
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    // Create user
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password, role, department_id, manager_id, joining_date, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [name, email, hashedPassword, role, resolvedDeptId, manager_id, new Date().toISOString().split('T')[0]]
    );

    const userId = result.insertId;

    // Initialize Inventory
    const inventory = role === 'STUDENT' ? [10, 5, 0, 10] : [10, 12, 15, 0];
    await pool.execute(
      'INSERT INTO leave_inventory (user_id, casual, sick, earned, medical) VALUES (?, ?, ?, ?, ?)',
      [userId, inventory[0], inventory[1], inventory[2], inventory[3]]
    );

    res.json({ id: userId, department_id: resolvedDeptId, message: `${role} added successfully to ${deptName} department.` });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }
    res.status(500).json({ message: 'Error adding user' });
  }
};

exports.checkPrincipalExists = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "PRINCIPAL"');
    res.json({ exists: rows[0].count > 0 });
  } catch (err) {
    res.status(500).json({ exists: true });
  }
};

/**
 * GET /api/departments
 */
exports.getDepartments = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM departments ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching departments' });
  }
};

/**
 * GET /api/departments/:id/users
 */
exports.getDepartmentUsers = async (req, res) => {
  try {
    const deptId = parseInt(req.params.id);
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, d.name as department_name
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.department_id = ?`,
      [deptId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching department users' });
  }
};

/**
 * GET /api/badges
 */
exports.getBadges = async (req, res) => {
  try {
    const badges = await getUserBadges(req.user.id);
    res.json(badges);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching badges' });
  }
};

/**
 * GET /api/audit-logs
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const [rows] = await pool.execute(
      `SELECT a.*, u.name as user_name 
       FROM audit_logs a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
};
