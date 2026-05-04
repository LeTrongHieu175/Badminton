const { env } = require('../config/env');
const { expireLockedBookings } = require('../services/booking-expiry.service');

let intervalRef = null;
let isRunning = false;

function startBookingExpiryJob() {
  if (!env.BOOKING_EXPIRY_JOB_ENABLED) {
    console.warn('[booking-expiry-job] disabled');
    return;
  }

  if (intervalRef) {
    return;
  }

  intervalRef = setInterval(async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      const result = await expireLockedBookings(200);
      if (result.expiredCount > 0 || result.completedCount > 0) {
        console.log(
          `[booking-expiry-job] expired ${result.expiredCount} bookings, completed ${result.completedCount} bookings`
        );
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
