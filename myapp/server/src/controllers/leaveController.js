const pool = require('../../config/db');
const { calculatePriorityScore, detectConflict } = require('../services/RuleEngine');
const { findApprover, getNextStage } = require('../services/smartRouter');
const { checkAndAwardBadges } = require('../services/gamificationService');

exports.submitLeave = async (req, res) => {
  const { startDate, endDate, reason, leaveType, isEmergency, durationType, documentUrl, delegateId } = req.body;
  const userId = req.user.id;
  const departmentId = req.user.department_id;

  try {
    // 1. Smart Router: Find correct approver based on role + department
    const { approver, stage, escalated } = await findApprover(userId, req.user.role, departmentId);

    // 2. Calculate full AI scoring
    const { score, teamLoad, isRisky, impactScore, riskScore, explanation } = 
      await calculatePriorityScore(userId, req.body, departmentId);

    // 3. Detect conflicts
    const conflicts = await detectConflict(userId, startDate, endDate, departmentId);

    // 4. Insert leave request
    const [result] = await pool.execute(
      `INSERT INTO leaves (user_id, start_date, end_date, reason, leave_type, status, priority_score, 
       is_emergency, duration_type, document_url, delegate_id, department_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, startDate, endDate, reason, leaveType, stage, score, 
       isEmergency || false, durationType || 'FULL', documentUrl || null, delegateId || null, departmentId]
    );

    const leaveId = result.insertId;

    // 5. Store AI scores
    await pool.execute(
      'INSERT INTO ai_scores (leave_id, priority_score, impact_score, risk_score, explanation) VALUES (?, ?, ?, ?, ?)',
      [leaveId, score, impactScore, riskScore, JSON.stringify(explanation)]
    );

    // 6. Check and award badges
    await checkAndAwardBadges(userId);

    res.json({
      id: leaveId,
      status: stage,
      priorityScore: score,
      approver: approver ? { name: approver.name } : null,
      escalated: escalated || false,
      conflicts: conflicts.length,
      message: escalated 
        ? `Leave escalated to ${stage} (normal approver unavailable).`
        : `Leave submitted → routed to ${approver?.name || stage}.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error submitting leave' });
  }
};

exports.getLeaves = async (req, res) => {
  try {
    let query = `
      SELECT l.*, u.name as userName, u.department, u.department_id,
             d.name as dept_name, u2.name as reviewerName 
      FROM leaves l 
      JOIN users u ON l.user_id = u.id 
      LEFT JOIN departments d ON l.department_id = d.id
      LEFT JOIN users u2 ON l.reviewer_id = u2.id`;
    let params = [];
    const role = req.user.role;
    const deptId = req.user.department_id;

    if (role === 'PRINCIPAL') {
      // Principal sees: their own leaves + all PENDING_PRINCIPAL
      query += ' WHERE (l.status = "PENDING_PRINCIPAL" OR l.user_id = ?)';
      params.push(req.user.id);
    } else if (role === 'HOD') {
      // HOD sees: PENDING_HOD from SAME department + own leaves
      query += ' WHERE ((l.status = "PENDING_HOD" AND l.department_id = ?) OR l.user_id = ?)';
      params.push(deptId, req.user.id);
    } else if (role === 'STAFF') {
      // Staff sees: PENDING_STAFF from SAME department + own leaves
      query += ' WHERE ((l.status = "PENDING_STAFF" AND l.department_id = ?) OR l.user_id = ?)';
      params.push(deptId, req.user.id);
    } else {
      // Students: only their own
      query += ' WHERE l.user_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY l.submitted_at DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching leaves' });
  }
};

exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status: action, comment } = req.body;
  const reviewerId = req.user.id;

  try {
    const [leaveRows] = await pool.execute('SELECT * FROM leaves WHERE id = ?', [id]);
    const leave = leaveRows[0];
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    // Department isolation check (except Principal)
    if (req.user.role !== 'PRINCIPAL' && leave.department_id !== req.user.department_id) {
      return res.status(403).json({ message: 'Access denied: Cross-department approval not allowed.' });
    }

    let nextStatus = action === 'REJECTED' ? 'REJECTED' : getNextStage(leave.status);

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update leave
      await connection.execute(
        'UPDATE leaves SET status = ?, reviewer_id = ?, reviewer_comment = ? WHERE id = ?',
        [nextStatus, reviewerId, comment || null, id]
      );

      // Record in approvals table
      await connection.execute(
        'INSERT INTO approvals (leave_id, approver_id, stage, status, comments) VALUES (?, ?, ?, ?, ?)',
        [id, reviewerId, leave.status, action === 'REJECTED' ? 'REJECTED' : 'FORWARDED', comment || null]
      );

      // Inventory deduction only on FINAL approval
      if (nextStatus === 'APPROVED') {
        let deductAmount = Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1;
        
        if (leave.duration_type === 'HALF_AM' || leave.duration_type === 'HALF_PM') {
          deductAmount = 0.5;
        }

        const typeColumn = leave.leave_type.toLowerCase();
        const allowedTypes = ['casual', 'sick', 'earned', 'medical'];
        if (allowedTypes.includes(typeColumn)) {
          await connection.execute(
            `UPDATE leave_inventory SET ${typeColumn} = GREATEST(0, ${typeColumn} - ?) WHERE user_id = ?`,
            [deductAmount, leave.user_id]
          );
        }

        // Award badges on approval
        await checkAndAwardBadges(leave.user_id);
      }

      await connection.commit();
      res.json({ message: `Status updated: ${leave.status} → ${nextStatus}`, newStatus: nextStatus });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating status' });
  }
};

/**
 * POST /api/leaves/:id/emergency-override
 * Principal emergency bypass — immediately approves a leave.
 */
exports.emergencyOverride = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.role !== 'PRINCIPAL') {
      return res.status(403).json({ message: 'Only Principal can use emergency override.' });
    }

    const [leaveRows] = await pool.execute('SELECT * FROM leaves WHERE id = ?', [id]);
    const leave = leaveRows[0];
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        'UPDATE leaves SET status = "APPROVED", reviewer_id = ?, reviewer_comment = "Emergency Override by Principal" WHERE id = ?',
        [req.user.id, id]
      );

      await connection.execute(
        'INSERT INTO approvals (leave_id, approver_id, stage, status, comments) VALUES (?, ?, ?, "APPROVED", "Emergency Override")',
        [id, req.user.id, leave.status]
      );

      // Deduct inventory
      let deductAmount = Math.ceil((new Date(leave.end_date) - new Date(leave.start_date)) / (1000 * 60 * 60 * 24)) + 1;
      if (leave.duration_type === 'HALF_AM' || leave.duration_type === 'HALF_PM') deductAmount = 0.5;
      
      const typeColumn = leave.leave_type.toLowerCase();
      const allowedTypes = ['casual', 'sick', 'earned', 'medical'];
      if (allowedTypes.includes(typeColumn)) {
        await connection.execute(
          `UPDATE leave_inventory SET ${typeColumn} = GREATEST(0, ${typeColumn} - ?) WHERE user_id = ?`,
          [deductAmount, leave.user_id]
        );
      }

      await connection.commit();
      res.json({ message: 'Emergency override applied. Leave approved immediately.' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error applying emergency override' });
  }
};
