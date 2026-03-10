const express = require('express');
const recommendationController = require('../controllers/recommendation.controller');
const { requireQueryFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.get('/courts', requireQueryFields(['date']), recommendationController.getRecommendedCourts);

module.exports = router;
