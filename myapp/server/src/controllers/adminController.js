const pool = require('../../config/db');

exports.getRules = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM rules');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching rules' });
  }
};

exports.updateRules = async (req, res) => {
  const { rules } = req.body;
  if (!rules || !Array.isArray(rules)) {
    return res.status(400).json({ message: 'Invalid rules array' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    for (const rule of rules) {
      await connection.execute(
        'UPDATE rules SET rule_value = ? WHERE rule_key = ?',
        [rule.rule_value, rule.rule_key]
      );
    }
    
    await connection.commit();
    res.json({ message: 'Rules updated successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error updating rules' });
  } finally {
    connection.release();
  }
};

exports.getSettings = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM global_settings');
    const settings = rows.reduce((acc, s) => ({ ...acc, [s.setting_key]: s.setting_value === 'true' }), {});
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching settings' });
  }
};

exports.updateSettings = async (req, res) => {
  const { key, value } = req.body;
  try {
    await pool.execute(
      'UPDATE global_settings SET setting_value = ? WHERE setting_key = ?',
      [value.toString(), key]
    );
    res.json({ message: 'Setting updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating setting' });
  }
};
