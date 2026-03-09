const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireBodyFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.post('/create-intent', authMiddleware, requireBodyFields(['bookingId']), paymentController.createIntent);
router.post('/webhook', paymentController.webhook);

module.exports = router;
