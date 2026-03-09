const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const Role = require('../models/role');

const authRoutes = require('./auth.routes');
const courtRoutes = require('./court.routes');
const bookingRoutes = require('./booking.routes');
const paymentRoutes = require('./payment.routes');
const analyticsRoutes = require('./analytics.routes');
const userRoutes = require('./user.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/courts', authMiddleware, courtRoutes);
router.use('/bookings', authMiddleware, bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/analytics', authMiddleware, roleMiddleware(Role.ADMIN), analyticsRoutes);
router.use('/users', authMiddleware, roleMiddleware(Role.ADMIN), userRoutes);

module.exports = router;
