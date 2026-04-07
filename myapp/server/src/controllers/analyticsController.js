const pool = require('../../config/db');

exports.getGlobalStats = async (req, res) => {
  try {
    const [pending] = await pool.execute('SELECT COUNT(*) as count FROM leaves WHERE status LIKE "PENDING%"');
    const [approved] = await pool.execute('SELECT COUNT(*) as count FROM leaves WHERE status = "APPROVED"');

    // Department-wise distribution
    const [deptStats] = await pool.execute(
      `SELECT d.name as department, COUNT(l.id) as count 
       FROM leaves l 
       JOIN departments d ON l.department_id = d.id 
       GROUP BY d.name`
    );

    res.json({
      totalPending: pending[0].count,
      totalApproved: approved[0].count,
      departmentStats: deptStats
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

exports.getPredictions = async (req, res) => {
  try {
    let query = `SELECT MONTHNAME(start_date) as month, COUNT(*) as count FROM leaves`;
    const params = [];

    // Department-scope for non-principals
    if (req.user.role !== 'PRINCIPAL' && req.user.department_id) {
      query += ' WHERE department_id = ?';
      params.push(req.user.department_id);
    }

    query += ` GROUP BY month ORDER BY FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')`;

    const [monthlyStats] = await pool.execute(query, params);

    const scores = monthlyStats.map(s => s.count);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const peakMonths = monthlyStats.filter(s => s.count > avg).map(s => s.month);

    res.json({
      monthlyTrends: monthlyStats,
      avgLeavesPerMonth: avg.toFixed(1),
      peakMonths,
      suggestion: peakMonths.length > 0 ? `${peakMonths.join(', ')} are high-volume months. Plan ahead!` : 'Leave volume is stable.'
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching predictions' });
  }
};

exports.getPatterns = async (req, res) => {
  try {
    let query = `SELECT DAYNAME(start_date) as day, COUNT(*) as count FROM leaves`;
    const params = [];

    if (req.user.department_id && req.user.role !== 'PRINCIPAL') {
      query += ' WHERE department_id = ?';
      params.push(req.user.department_id);
    }

    query += ' GROUP BY day';

    const [clusters] = await pool.execute(query, params);
    // Fixed: was returning 500 status on success
    res.json(clusters);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching clusters' });
  }
};

exports.getGlobalCapacity = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const deptFilter = req.user.role !== 'PRINCIPAL' && req.user.department_id
      ? `AND department_id = ${parseInt(req.user.department_id)}`
      : '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + parseInt(days));

    const [leaves] = await pool.execute(
      `SELECT start_date, end_date FROM leaves WHERE status = 'APPROVED' ${deptFilter} AND end_date >= ? AND start_date <= ?`,
      [today.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    const capacityMap = {};
    for (let i = 0; i < parseInt(days); i++) {
       const d = new Date(today);
       d.setDate(d.getDate() + i);
       const dateStr = d.toISOString().split('T')[0];
       capacityMap[dateStr] = 0;
    }

    leaves.forEach(l => {
       const start = new Date(l.start_date);
       const end = new Date(l.end_date);
       for (let d = new Date(Math.max(start, today)); d <= Math.min(end, endDate); d.setDate(d.getDate() + 1)) {
          const dictKey = d.toISOString().split('T')[0];
          if (capacityMap[dictKey] !== undefined) capacityMap[dictKey]++;
       }
    });

    const rows = Object.keys(capacityMap).sort().map(date => ({ date, count: capacityMap[date] }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching capacity' });
  }
};

exports.getDepartmentalComparison = async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        d.name as department, 
        COUNT(l.id) as total_requests,
        SUM(CASE WHEN l.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
        ROUND(AVG(l.priority_score), 1) as avg_score,
        ROUND((SUM(CASE WHEN l.status = 'APPROVED' THEN 1 ELSE 0 END) / GREATEST(COUNT(l.id), 1)) * 100, 1) as approval_rate
      FROM departments d
      LEFT JOIN leaves l ON d.id = l.department_id
      GROUP BY d.id, d.name
      HAVING total_requests > 0
    `);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching comparison' });
  }
};

/**
 * GET /api/analytics/heatmap
 * Department-wise daily leave counts for heatmap visualization.
 */
exports.getHeatmapData = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const deptId = req.query.department_id || req.user.department_id;
    let deptFilter = '';
    const params = [];
    
    if (deptId) {
      deptFilter = 'AND department_id = ?';
      params.push(parseInt(deptId));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - parseInt(days));

    params.push(startDate.toISOString().split('T')[0], today.toISOString().split('T')[0]);

    const [leaves] = await pool.execute(
      `SELECT start_date, end_date FROM leaves WHERE status = 'APPROVED' ${deptFilter} AND end_date >= ? AND start_date <= ?`,
      params
    );

    const heatmapMap = {};
    for (let i = 0; i <= parseInt(days); i++) {
       const d = new Date(startDate);
       d.setDate(d.getDate() + i);
       const dateStr = d.toISOString().split('T')[0];
       heatmapMap[dateStr] = 0;
    }

    leaves.forEach(l => {
       const start = new Date(l.start_date);
       const end = new Date(l.end_date);
       for (let d = new Date(Math.max(start, startDate)); d <= Math.min(end, today); d.setDate(d.getDate() + 1)) {
          const dictKey = d.toISOString().split('T')[0];
          if (heatmapMap[dictKey] !== undefined) heatmapMap[dictKey]++;
       }
    });

    const rows = Object.keys(heatmapMap).sort().map(date => ({ date, count: heatmapMap[date] }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching heatmap' });
  }
};
