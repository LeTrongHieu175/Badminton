const bookingService = require('../services/booking.service');
const { sendSuccess, asyncHandler } = require('../utils/response');

const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(req.user, req.body);
  return sendSuccess(res, booking, 'Booking locked successfully', 201);
});

const getAllBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getAllBookings(req.user, {
    userId: req.query.userId,
    userName: req.query.userName,
    status: req.query.status,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    page: req.query.page,
    limit: req.query.limit
  });

  return sendSuccess(res, result);
});

const getUserBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getUserBookings(req.user, req.params.id, {
    page: req.query.page,
    limit: req.query.limit
  });

  return sendSuccess(res, result);
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.user, req.params.id);
  const message = booking.status === 'REFUNDED' ? 'Booking refunded successfully' : 'Booking cancelled successfully';
  return sendSuccess(res, booking, message);
});

const completeBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.completeBooking(req.user, req.params.id);
  return sendSuccess(res, booking, 'Booking completed successfully');
});

module.exports = {
  createBooking,
  getAllBookings,
  getUserBookings,
  cancelBooking,
  completeBooking
};
