const pool = require('../../config/db');
const { getLeaveRecommendation, analyzeBehavior } = require('../services/RuleEngine');

/**
 * GET /api/ai/recommendations
 * Get optimal leave dates for the user's department.
 */
exports.getRecommendations = async (req, res) => {
  try {
    const departmentId = req.user.department_id;
    const days = parseInt(req.query.days) || 1;
    const recommendations = await getLeaveRecommendation(departmentId, days);
    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching recommendations' });
  }
};

/**
 * GET /api/ai/behavior/:userId
 * Behavioral pattern analysis for a specific user.
 */
exports.getBehaviorAnalysis = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId) || req.user.id;

    // Access control: only self, manager, or PRINCIPAL can view
    if (targetUserId !== req.user.id && req.user.role !== 'PRINCIPAL') {
      // Check if requester is the target's manager
      const [target] = await pool.execute('SELECT manager_id, department_id FROM users WHERE id = ?', [targetUserId]);
      if (!target[0] || (target[0].manager_id !== req.user.id && target[0].department_id !== req.user.department_id)) {
        return res.status(403).json({ message: 'Access denied: Cannot view this user\'s behavior' });
      }
    }

    const analysis = await analyzeBehavior(targetUserId);
    res.json(analysis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error analyzing behavior' });
  }
};

/**
 * GET /api/ai/explanation/:leaveId
 * Get the XAI explanation for a specific leave's scoring.
 */
exports.getExplanation = async (req, res) => {
  try {
    const leaveId = parseInt(req.params.leaveId);

    const [scores] = await pool.execute(
      'SELECT * FROM ai_scores WHERE leave_id = ?',
      [leaveId]
    );

    if (scores.length === 0) {
      return res.status(404).json({ message: 'No AI scores found for this leave' });
    }

    const scoreData = scores[0];
    let explanation = [];
    try {
      explanation = typeof scoreData.explanation === 'string'
        ? JSON.parse(scoreData.explanation)
        : scoreData.explanation || [];
    } catch (e) {
      explanation = [];
    }

    res.json({
      leaveId,
      priorityScore: scoreData.priority_score,
      impactScore: scoreData.impact_score,
      riskScore: scoreData.risk_score,
      explanation
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching explanation' });
  }
};

/**
 * GET /api/ai/impact/:leaveId
 * Impact analysis for a specific leave.
 */
exports.getImpactAnalysis = async (req, res) => {
  try {
    const leaveId = parseInt(req.params.leaveId);

    const [leave] = await pool.execute(
      `SELECT l.*, u.department_id, d.name as dept_name 
       FROM leaves l 
       JOIN users u ON l.user_id = u.id 
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE l.id = ?`,
      [leaveId]
    );

    if (leave.length === 0) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    const leaveData = leave[0];
    const deptId = leaveData.department_id;

    // Calculate current dept load
    const [deptMembers] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE department_id = ? AND is_active = TRUE',
      [deptId]
    );
    const deptSize = deptMembers[0].count || 1;

    // Get overlapping approved leaves
    const [overlapping] = await pool.execute(
      `SELECT COUNT(*) as count FROM leaves 
       WHERE department_id = ? AND status = 'APPROVED' 
       AND id != ?
       AND ((start_date <= ?) AND (end_date >= ?))`,
      [deptId, leaveId, leaveData.end_date, leaveData.start_date]
    );

    const currentLoad = overlapping[0].count / deptSize;
    const projectedLoad = (overlapping[0].count + 1) / deptSize;

    const impactPercentage = Math.round(projectedLoad * 100);

    res.json({
      department: leaveData.dept_name,
      departmentSize: deptSize,
      overlappingLeaves: overlapping[0].count,
      currentLoadPercent: Math.round(currentLoad * 100),
      projectedLoadPercent: impactPercentage,
      impactMessage: `Approving this leave may reduce ${leaveData.dept_name} team efficiency by ${impactPercentage}%`,
      severity: projectedLoad > 0.5 ? 'high' : projectedLoad > 0.3 ? 'medium' : 'low'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error computing impact' });
  }
};

/**
 * GET /api/ai/department-health
 * Department health overview for dashboards.
 */
exports.getDepartmentHealth = async (req, res) => {
  try {
    const [departments] = await pool.execute('SELECT * FROM departments ORDER BY name');
    const today = new Date().toISOString().split('T')[0];
    const health = [];

    for (const dept of departments) {
      const [members] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE department_id = ? AND is_active = TRUE',
        [dept.id]
      );
      const [onLeave] = await pool.execute(
        `SELECT COUNT(*) as count FROM leaves 
         WHERE department_id = ? AND status = 'APPROVED' 
         AND ? BETWEEN start_date AND end_date`,
        [dept.id, today]
      );
      const [pending] = await pool.execute(
        `SELECT COUNT(*) as count FROM leaves 
         WHERE department_id = ? AND status LIKE 'PENDING%'`,
        [dept.id]
      );

      const memberCount = members[0].count || 0;
      const availabilityRate = memberCount > 0 ? ((memberCount - onLeave[0].count) / memberCount * 100) : 100;

      health.push({
        departmentId: dept.id,
        departmentName: dept.name,
        totalMembers: memberCount,
        onLeaveToday: onLeave[0].count,
        pendingRequests: pending[0].count,
        availabilityRate: Math.round(availabilityRate)
      });
    }

    res.json(health);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error computing department health' });
  }
};
