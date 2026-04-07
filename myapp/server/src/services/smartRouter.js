const pool = require('../../config/db');

/**
 * Smart Router Service
 * Dynamically resolves the correct approver based on user role + department.
 * Handles escalation when approver is unavailable.
 */

/**
 * Find the correct approver for a leave request within the same department.
 */
exports.findApprover = async (userId, userRole, departmentId) => {
  try {
    if (userRole === 'STUDENT') {
      // Student → Staff in the same department
      const [staff] = await pool.execute(
        'SELECT id, name, email FROM users WHERE role = "STAFF" AND department_id = ? AND is_active = TRUE ORDER BY id ASC',
        [departmentId]
      );
      if (staff.length > 0) return { approver: staff[0], stage: 'PENDING_STAFF' };

      // Escalation: No active staff → go directly to HOD
      const [hods] = await pool.execute(
        'SELECT id, name, email FROM users WHERE role = "HOD" AND department_id = ? AND is_active = TRUE ORDER BY id ASC',
        [departmentId]
      );
      if (hods.length > 0) return { approver: hods[0], stage: 'PENDING_HOD', escalated: true };

      // Final escalation → Principal
      const [principals] = await pool.execute(
        'SELECT id, name, email FROM users WHERE role = "PRINCIPAL" AND is_active = TRUE ORDER BY id ASC'
      );
      if (principals.length > 0) return { approver: principals[0], stage: 'PENDING_PRINCIPAL', escalated: true };

      return { approver: null, stage: 'ESCALATED', escalated: true };
    }

    if (userRole === 'STAFF') {
      // Staff → HOD in the same department
      const [hods] = await pool.execute(
        'SELECT id, name, email FROM users WHERE role = "HOD" AND department_id = ? AND is_active = TRUE ORDER BY id ASC',
        [departmentId]
      );
      if (hods.length > 0) return { approver: hods[0], stage: 'PENDING_HOD' };

      // Escalation → Principal
      const [principals] = await pool.execute(
        'SELECT id, name, email FROM users WHERE role = "PRINCIPAL" AND is_active = TRUE ORDER BY id ASC'
      );
      if (principals.length > 0) return { approver: principals[0], stage: 'PENDING_PRINCIPAL', escalated: true };

      return { approver: null, stage: 'ESCALATED', escalated: true };
    }

    if (userRole === 'HOD') {
      // HOD → Principal
      const [principals] = await pool.execute(
        'SELECT id, name, email FROM users WHERE role = "PRINCIPAL" AND is_active = TRUE ORDER BY id ASC'
      );
      if (principals.length > 0) return { approver: principals[0], stage: 'PENDING_PRINCIPAL' };
      return { approver: null, stage: 'ESCALATED', escalated: true };
    }

    return { approver: null, stage: 'ESCALATED', escalated: true };
  } catch (err) {
    console.error('Smart Router error:', err);
    return { approver: null, stage: 'ESCALATED', escalated: true };
  }
};

/**
 * Get the next stage when a leave is approved at the current stage.
 */
exports.getNextStage = (currentStage) => {
  const progression = {
    'PENDING_STAFF': 'PENDING_HOD',
    'PENDING_HOD': 'PENDING_PRINCIPAL',
    'PENDING_PRINCIPAL': 'APPROVED'
  };
  return progression[currentStage] || 'APPROVED';
};

/**
 * Check if an approver is available (active and exists).
 */
exports.isApproverAvailable = async (approverId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT is_active FROM users WHERE id = ?',
      [approverId]
    );
    return rows.length > 0 && rows[0].is_active;
  } catch (err) {
    return false;
  }
};
