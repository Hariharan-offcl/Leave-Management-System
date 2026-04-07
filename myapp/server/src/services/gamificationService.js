const pool = require('../../config/db');

const BADGE_DEFINITIONS = [
  {
    type: 'early_planner',
    name: '🗓️ Early Planner',
    description: 'Applied for leave 10+ days in advance',
    check: async (userId) => {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) as count FROM leaves 
         WHERE user_id = ? AND DATEDIFF(start_date, submitted_at) >= 10`,
        [userId]
      );
      return rows[0].count >= 1;
    }
  },
  {
    type: 'perfect_attendance',
    name: '⭐ Perfect Attendance',
    description: 'No leaves taken in the last 30 days',
    check: async (userId) => {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) as count FROM leaves 
         WHERE user_id = ? AND status = 'APPROVED' 
         AND start_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
        [userId]
      );
      return rows[0].count === 0;
    }
  },
  {
    type: 'responsible_leaver',
    name: '🎯 Responsible Leaver',
    description: 'All leaves approved with high average priority score',
    check: async (userId) => {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
                AVG(priority_score) as avg_score
         FROM leaves WHERE user_id = ?`,
        [userId]
      );
      const { total, approved, avg_score } = rows[0];
      return total >= 3 && approved === total && avg_score >= 60;
    }
  },
  {
    type: 'streak_master',
    name: '🔥 Streak Master',
    description: '60+ consecutive days without taking leave',
    check: async (userId) => {
      const [rows] = await pool.execute(
        `SELECT MAX(start_date) as last_leave FROM leaves 
         WHERE user_id = ? AND status = 'APPROVED'`,
        [userId]
      );
      if (!rows[0].last_leave) return true; // never taken leave = streak
      const daysSince = Math.floor((Date.now() - new Date(rows[0].last_leave)) / (1000 * 60 * 60 * 24));
      return daysSince >= 60;
    }
  },
  {
    type: 'first_leave',
    name: '📝 First Steps',
    description: 'Submitted your first leave application',
    check: async (userId) => {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM leaves WHERE user_id = ?',
        [userId]
      );
      return rows[0].count >= 1;
    }
  }
];

/**
 * Check and award badges for a user.
 */
exports.checkAndAwardBadges = async (userId) => {
  const awarded = [];
  
  for (const badge of BADGE_DEFINITIONS) {
    try {
      // Check if already earned
      const [existing] = await pool.execute(
        'SELECT id FROM badges WHERE user_id = ? AND badge_type = ?',
        [userId, badge.type]
      );
      
      if (existing.length > 0) continue;

      const earned = await badge.check(userId);
      if (earned) {
        await pool.execute(
          'INSERT INTO badges (user_id, badge_type, badge_name, description) VALUES (?, ?, ?, ?)',
          [userId, badge.type, badge.name, badge.description]
        );
        awarded.push({ type: badge.type, name: badge.name, description: badge.description });
      }
    } catch (err) {
      console.error(`Badge check failed for ${badge.type}:`, err.message);
    }
  }

  return awarded;
};

/**
 * Get all badges for a user.
 */
exports.getUserBadges = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT badge_type, badge_name, description, earned_at FROM badges WHERE user_id = ? ORDER BY earned_at DESC',
    [userId]
  );
  return rows;
};

/**
 * Get all badge definitions (for showing progress).
 */
exports.getBadgeDefinitions = () => {
  return BADGE_DEFINITIONS.map(b => ({
    type: b.type,
    name: b.name,
    description: b.description
  }));
};
