const express = require('express');
const bookingController = require('../controllers/booking.controller');
const roleMiddleware = require('../middleware/role.middleware');
const Role = require('../models/role');
const { requireBodyFields } = require('../middleware/validate.middleware');

const router = express.Router();

router.post('/', requireBodyFields(['courtId', 'slotId', 'date']), bookingController.createBooking);
router.get('/', roleMiddleware(Role.ADMIN), bookingController.getAllBookings);
router.get('/user/:id', bookingController.getUserBookings);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
