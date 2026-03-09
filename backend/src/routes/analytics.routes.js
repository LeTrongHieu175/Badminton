const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { requireQueryFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/revenue', requireQueryFields(['start_date', 'end_date']), analyticsController.getRevenue);
router.get('/peak-hours', requireQueryFields(['start_date', 'end_date']), analyticsController.getPeakHours);
router.get('/utilization', requireQueryFields(['start_date', 'end_date']), analyticsController.getUtilization);
router.get('/top-users', requireQueryFields(['start_date', 'end_date']), analyticsController.getTopUsers);

module.exports = router;
