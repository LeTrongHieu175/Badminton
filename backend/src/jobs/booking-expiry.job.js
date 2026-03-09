const { env } = require('../config/env');
const { expireLockedBookings } = require('../services/booking-expiry.service');

let intervalRef = null;
let isRunning = false;

function startBookingExpiryJob() {
  if (intervalRef) {
    return;
  }

  intervalRef = setInterval(async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      const expiredCount = await expireLockedBookings(200);
      if (expiredCount > 0) {
        console.log(`[booking-expiry-job] expired ${expiredCount} bookings`);
      }
    } catch (error) {
      console.error('[booking-expiry-job] failed', error);
    } finally {
      isRunning = false;
    }
  }, env.BOOKING_SWEEP_INTERVAL_MS);

  if (typeof intervalRef.unref === 'function') {
    intervalRef.unref();
  }
}

function stopBookingExpiryJob() {
  if (!intervalRef) {
    return;
  }

  clearInterval(intervalRef);
  intervalRef = null;
}

module.exports = {
  startBookingExpiryJob,
  stopBookingExpiryJob
};
