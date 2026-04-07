const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const leaveController = require('../controllers/leaveController');
const analyticsController = require('../controllers/analyticsController');
const adminController = require('../controllers/adminController');
const aiController = require('../controllers/aiController');

// ─── Auth Routes ───
router.post('/auth/register-principal', authController.registerPrincipal);
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.getMe);

// ─── User Routes ───
router.get('/users/check-principal', userController.checkPrincipalExists);
router.get('/users/subordinates', authMiddleware, userController.getSubordinates);
router.post('/users', authMiddleware, checkRole(['PRINCIPAL', 'HOD', 'STAFF']), userController.addUser);

// ─── Department Routes ───
router.get('/departments', authMiddleware, userController.getDepartments);
router.get('/departments/:id/users', authMiddleware, userController.getDepartmentUsers);

// ─── Leave Routes ───
router.get('/leaves', authMiddleware, leaveController.getLeaves);
router.post('/leaves', authMiddleware, leaveController.submitLeave);
router.patch('/leaves/:id', authMiddleware, checkRole(['PRINCIPAL', 'HOD', 'STAFF']), leaveController.updateStatus);
router.post('/leaves/:id/emergency-override', authMiddleware, checkRole(['PRINCIPAL']), leaveController.emergencyOverride);

// ─── AI / Intelligence Routes (Rule-Based) ───
router.get('/ai/recommendations', authMiddleware, aiController.getRecommendations);
router.get('/ai/behavior/:userId', authMiddleware, aiController.getBehaviorAnalysis);
router.get('/ai/explanation/:leaveId', authMiddleware, aiController.getExplanation);
router.get('/ai/impact/:leaveId', authMiddleware, aiController.getImpactAnalysis);
router.get('/ai/department-health', authMiddleware, checkRole(['PRINCIPAL', 'HOD']), aiController.getDepartmentHealth);

// ─── Analytics Routes ───
router.get('/analytics/stats', authMiddleware, checkRole(['PRINCIPAL', 'HOD']), analyticsController.getGlobalStats);
router.get('/analytics/predictions', authMiddleware, analyticsController.getPredictions);
router.get('/analytics/patterns', authMiddleware, analyticsController.getPatterns);
router.get('/analytics/capacity', authMiddleware, analyticsController.getGlobalCapacity);
router.get('/analytics/comparison', authMiddleware, checkRole(['PRINCIPAL']), analyticsController.getDepartmentalComparison);
router.get('/analytics/heatmap', authMiddleware, analyticsController.getHeatmapData);

// ─── Badges & Gamification ───
router.get('/badges', authMiddleware, userController.getBadges);

// ─── Admin & Settings Routes ───
router.get('/admin/rules', authMiddleware, checkRole(['PRINCIPAL']), adminController.getRules);
router.patch('/admin/rules', authMiddleware, checkRole(['PRINCIPAL']), adminController.updateRules);
router.get('/admin/settings', authMiddleware, adminController.getSettings);
router.patch('/admin/settings', authMiddleware, checkRole(['PRINCIPAL']), adminController.updateSettings);

// ─── Audit Trail ───
router.get('/audit-logs', authMiddleware, checkRole(['PRINCIPAL']), userController.getAuditLogs);

module.exports = router;
