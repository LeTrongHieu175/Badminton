const paymentService = require('../services/payment.service');
const { sendSuccess, asyncHandler } = require('../utils/response');

const createIntent = asyncHandler(async (req, res) => {
  const result = await paymentService.createPaymentIntent(req.user, req.body);
  return sendSuccess(res, result, 'Payment intent created', 201);
});

const sepayWebhook = asyncHandler(async (req, res) => {
  await paymentService.handleWebhook(req.body, req.headers);
  return res.status(200).json({ success: true });
});

module.exports = {
  createIntent,
  sepayWebhook
};
