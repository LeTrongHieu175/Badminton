const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { requireBodyFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.post('/', requireBodyFields(['courtId', 'slotId', 'date']), bookingController.createBooking);
router.get('/user/:id', bookingController.getUserBookings);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
