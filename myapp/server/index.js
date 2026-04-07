const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const db = require('./config/db');
const auditLogger = require('./src/middleware/auditLogger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(auditLogger);

// Routes
const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.json({
    name: 'ALIS — Adaptive Leave Intelligence System',
    version: '2.0.0',
    status: 'operational',
    features: [
      'Department-Based Auto Routing',
      'Rule-Based Priority Scoring',
      'Smart Approver Escalation',
      'Behavioral Pattern Analysis',
      'Gamification Badges',
      'Full Audit Trail'
    ]
  });
});

// Database Connection Test
db.getConnection()
  .then(connection => {
    console.log('✅ MySQL Connected successfully to erp_leave_system');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

// Start Server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║     🧠 A.L.I.S  v2.0 — OPERATIONAL     ║
║  Adaptive Leave Intelligence System     ║
║  Server: http://localhost:${PORT}           ║
╚══════════════════════════════════════════╝
  `);
});
