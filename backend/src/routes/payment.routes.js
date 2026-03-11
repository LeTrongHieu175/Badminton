const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireBodyFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.post('/create-intent', authMiddleware, requireBodyFields(['bookingId']), paymentController.createIntent);
router.post('/webhook/sepay', paymentController.sepayWebhook);
router.post('/webhook', paymentController.sepayWebhook);

module.exports = router;
