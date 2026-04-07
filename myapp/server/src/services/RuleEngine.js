const pool = require('../../config/db');

/**
 * ALIS Rule-Based Intelligence Engine
 * All scoring is deterministic — no ML models.
 */

/**
 * Calculate Priority Score (0–100) based on:
 * - Leave balance
 * - Advance notice (days ahead)
 * - Department load (percentage of dept on leave)
 * - Emergency flag
 * - Past leave behavior (frequency)
 */
exports.calculatePriorityScore = async (userId, leaveData, departmentId) => {
  try {
    // 1. Get Rules from DB
    const [ruleRows] = await pool.execute('SELECT * FROM rules');
    const rules = ruleRows.reduce((acc, r) => ({ ...acc, [r.rule_key]: parseFloat(r.rule_value) }), {});

    const [settingRows] = await pool.execute('SELECT * FROM global_settings WHERE setting_key = "emergency_override"');
    const isOverrideActive = settingRows[0]?.setting_value === 'true';

    // 2. Emergency Override short-circuit
    if (isOverrideActive) {
      return {
        score: 100,
        teamLoad: 0,
        isRisky: false,
        impactScore: 0,
        riskScore: 0,
        explanation: [{ factor: 'Emergency Override', detail: 'System emergency mode active — all applications receive maximum priority.', impact: '+100' }]
      };
    }

    // 3. Get User Inventory
    const [inventoryRows] = await pool.execute('SELECT * FROM leave_inventory WHERE user_id = ?', [userId]);
    const inventory = inventoryRows[0] || {};
    const typeKey = (leaveData.leaveType || 'casual').toLowerCase();
    const balance = inventory[typeKey] || 0;

    // 4. Calculate Department Load
    let teamLoad = 0;
    let deptSize = 1;
    if (departmentId) {
      const [deptMembers] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE department_id = ? AND is_active = TRUE',
        [departmentId]
      );
      deptSize = deptMembers[0].count || 1;

      const today = new Date().toISOString().split('T')[0];
      const [activeLeaves] = await pool.execute(
        `SELECT COUNT(*) as count FROM leaves 
         WHERE status = 'APPROVED' 
         AND ? BETWEEN start_date AND end_date 
         AND department_id = ?`,
        [today, departmentId]
      );
      teamLoad = activeLeaves[0].count / deptSize;
    }

    // 5. Days-Ahead (Advance Notice)
    const startDate = new Date(leaveData.startDate || leaveData.start_date);
    const daysAhead = Math.max(0, Math.floor((startDate - new Date()) / (1000 * 60 * 60 * 24)));

    // 6. Past Behavior Score
    const [pastLeaves] = await pool.execute(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN DATEDIFF(start_date, submitted_at) < 2 THEN 1 ELSE 0 END) as last_minute
       FROM leaves WHERE user_id = ?`,
      [userId]
    );
    const lastMinuteRatio = pastLeaves[0].total > 0 ? pastLeaves[0].last_minute / pastLeaves[0].total : 0;

    // 7. Score Calculation
    const explanation = [];
    let score = 50; // Base score

    // Balance factor (0-20 points)
    const balanceScore = Math.min(20, balance * 2);
    score += balanceScore;
    explanation.push({ factor: 'Leave Balance', detail: `${balance} days remaining for ${typeKey}`, impact: `+${balanceScore.toFixed(0)}` });

    // Advance notice (0-15 points)
    const advanceScore = daysAhead > 10 ? (rules.early_planning_bonus || 10) : Math.min(10, daysAhead);
    score += advanceScore;
    explanation.push({ factor: 'Advance Notice', detail: `Applied ${daysAhead} days ahead`, impact: `+${advanceScore.toFixed(0)}` });

    // Department load (penalty: 0 to -30)
    const loadPenalty = teamLoad * (rules.team_load_threshold || 0.4) * 75;
    score -= loadPenalty;
    explanation.push({ factor: 'Department Load', detail: `${(teamLoad * 100).toFixed(0)}% of department on leave`, impact: `-${loadPenalty.toFixed(0)}` });

    // Emergency bonus
    if (leaveData.is_emergency || leaveData.isEmergency) {
      const emergBonus = rules.emergency_weight || 50;
      score += emergBonus;
      explanation.push({ factor: 'Emergency Flag', detail: 'Marked as critical emergency', impact: `+${emergBonus}` });
    }

    // Past behavior penalty
    if (lastMinuteRatio > 0.5) {
      const behaviorPenalty = 15;
      score -= behaviorPenalty;
      explanation.push({ factor: 'Behavioral Pattern', detail: `${(lastMinuteRatio * 100).toFixed(0)}% of past leaves were last-minute`, impact: `-${behaviorPenalty}` });
    }

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // 8. Impact Score (how much this leave affects department)
    const leaveDays = Math.max(1, Math.ceil((new Date(leaveData.endDate || leaveData.end_date) - startDate) / (1000 * 60 * 60 * 24)) + 1);
    const impactScore = Math.min(100, (teamLoad * 100) + (leaveDays * 5) + (deptSize < 5 ? 20 : 0));

    // 9. Risk Score (user behavioral risk)
    const riskScore = Math.min(100, (lastMinuteRatio * 60) + (pastLeaves[0].total > 10 ? 20 : 0));

    return {
      score: Math.round(score * 100) / 100,
      teamLoad,
      isRisky: teamLoad > (rules.team_load_threshold || 0.4),
      impactScore: Math.round(impactScore * 100) / 100,
      riskScore: Math.round(riskScore * 100) / 100,
      explanation
    };
  } catch (err) {
    console.error('Error calculating score:', err);
    return { score: 50, teamLoad: 0, isRisky: false, impactScore: 0, riskScore: 0, explanation: [] };
  }
};

/**
 * Detect scheduling conflicts within the same department.
 */
exports.detectConflict = async (userId, startDate, endDate, departmentId) => {
  if (!departmentId) return [];

  const [conflicts] = await pool.execute(
    `SELECT l.*, u.name as user_name 
     FROM leaves l 
     JOIN users u ON l.user_id = u.id 
     WHERE u.department_id = ? AND l.status = 'APPROVED' 
     AND l.user_id != ?
     AND ((l.start_date <= ?) AND (l.end_date >= ?))`,
    [departmentId, userId, endDate, startDate]
  );

  return conflicts;
};

/**
 * Get leave recommendation — suggest optimal dates.
 */
exports.getLeaveRecommendation = async (departmentId, daysNeeded = 1) => {
  try {
    const recommendations = [];
    const today = new Date();

    // Check next 30 days for low-load windows
    for (let i = 1; i <= 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Skip weekends
      const dayOfWeek = checkDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const [absences] = await pool.execute(
        `SELECT COUNT(*) as count FROM leaves 
         WHERE department_id = ? AND status = 'APPROVED' 
         AND ? BETWEEN start_date AND end_date`,
        [departmentId, dateStr]
      );

      const [deptSize] = await pool.execute(
        'SELECT COUNT(*) as count FROM users WHERE department_id = ? AND is_active = TRUE',
        [departmentId]
      );

      const load = deptSize[0].count > 0 ? absences[0].count / deptSize[0].count : 0;

      if (load < 0.2) {
        recommendations.push({
          date: dateStr,
          dayName: checkDate.toLocaleDateString('en-US', { weekday: 'long' }),
          loadPercentage: (load * 100).toFixed(0),
          score: 'excellent'
        });
      } else if (load < 0.4) {
        recommendations.push({
          date: dateStr,
          dayName: checkDate.toLocaleDateString('en-US', { weekday: 'long' }),
          loadPercentage: (load * 100).toFixed(0),
          score: 'good'
        });
      }

      if (recommendations.length >= 5) break;
    }

    return recommendations;
  } catch (err) {
    console.error('Recommendation error:', err);
    return [];
  }
};

/**
 * Behavioral Analysis for a user.
 */
exports.analyzeBehavior = async (userId) => {
  try {
    // 1. Total leaves
    const [total] = await pool.execute('SELECT COUNT(*) as count FROM leaves WHERE user_id = ?', [userId]);

    // 2. Last-minute leaves (applied < 2 days before start)
    const [lastMinute] = await pool.execute(
      `SELECT COUNT(*) as count FROM leaves 
       WHERE user_id = ? AND DATEDIFF(start_date, submitted_at) < 2`,
      [userId]
    );

    // 3. Day-of-week distribution
    const [dayDist] = await pool.execute(
      `SELECT DAYNAME(start_date) as day, COUNT(*) as count 
       FROM leaves WHERE user_id = ? GROUP BY day`,
      [userId]
    );

    // 4. Monthly distribution
    const [monthDist] = await pool.execute(
      `SELECT MONTHNAME(start_date) as month, COUNT(*) as count 
       FROM leaves WHERE user_id = ? GROUP BY month`,
      [userId]
    );

    // 5. Average priority score
    const [avgScore] = await pool.execute(
      'SELECT AVG(priority_score) as avg_score FROM leaves WHERE user_id = ?',
      [userId]
    );

    // 6. Weekend cluster detection (Fri/Mon pattern)
    const [weekendClusters] = await pool.execute(
      `SELECT COUNT(*) as count FROM leaves 
       WHERE user_id = ? AND (DAYOFWEEK(start_date) = 2 OR DAYOFWEEK(start_date) = 6)`,
      [userId]
    );

    const totalCount = total[0].count || 1;
    const lastMinuteRatio = lastMinute[0].count / totalCount;
    const weekendClusterRatio = weekendClusters[0].count / totalCount;

    // Risk score calculation
    let riskScore = 0;
    const patterns = [];

    if (lastMinuteRatio > 0.5) {
      riskScore += 40;
      patterns.push({ type: 'warning', label: 'Frequent last-minute applications', detail: `${(lastMinuteRatio * 100).toFixed(0)}% of leaves applied < 2 days ahead` });
    }
    if (weekendClusterRatio > 0.4) {
      riskScore += 30;
      patterns.push({ type: 'warning', label: 'Weekend clustering pattern', detail: `${(weekendClusterRatio * 100).toFixed(0)}% of leaves on Fridays or Mondays` });
    }
    if (totalCount > 12) {
      riskScore += 20;
      patterns.push({ type: 'info', label: 'High leave frequency', detail: `${totalCount} total leave applications` });
    }

    if (patterns.length === 0) {
      patterns.push({ type: 'success', label: 'Responsible leave behavior', detail: 'No concerning patterns detected' });
    }

    return {
      totalLeaves: total[0].count,
      lastMinuteLeaves: lastMinute[0].count,
      lastMinuteRatio: (lastMinuteRatio * 100).toFixed(1),
      avgPriorityScore: avgScore[0].avg_score?.toFixed(1) || 'N/A',
      dayDistribution: dayDist,
      monthDistribution: monthDist,
      weekendClusterRatio: (weekendClusterRatio * 100).toFixed(1),
      riskScore: Math.min(100, riskScore),
      patterns
    };
  } catch (err) {
    console.error('Behavior analysis error:', err);
    return { totalLeaves: 0, riskScore: 0, patterns: [] };
  }
};
