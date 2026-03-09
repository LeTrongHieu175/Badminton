const paymentService = require('../services/payment.service');
const { sendSuccess, asyncHandler } = require('../utils/response');

const createIntent = asyncHandler(async (req, res) => {
  const result = await paymentService.createPaymentIntent(req.user, req.body);
  return sendSuccess(res, result, 'Payment intent created', 201);
});

const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const result = await paymentService.handleWebhook(req.body, signature);
  return sendSuccess(res, result, 'Webhook processed');
});

module.exports = {
  createIntent,
  webhook
};
