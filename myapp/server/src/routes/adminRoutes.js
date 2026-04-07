const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isPrincipal } = require('../middleware/authMiddlware');

// Only the Principal can manage rules!
router.get('/rules', verifyToken, isPrincipal, adminController.getRules);
router.patch('/rules', verifyToken, isPrincipal, adminController.updateRules);

module.exports = router;
