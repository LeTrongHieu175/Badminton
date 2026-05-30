const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const Role = require('../models/role');
const settingsController = require('../controllers/settings.controller');

const router = express.Router();

router.get('/', settingsController.getSettings);
router.patch('/', authMiddleware, roleMiddleware(Role.ADMIN), settingsController.updateSettings);

module.exports = router;
