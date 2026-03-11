const { withTransaction } = require('../config/db');
const bookingRepository = require('../repositories/booking.repository');
const lockService = require('./lock.service');
const { emitSlotUpdated } = require('../sockets/booking.socket');
const { toSlotUpdatedPayload } = require('./booking.service');

async function expireLockedBookings(batchSize = 100) {
  const { expiredBookings, completedBookings } = await withTransaction(async (client) => {
    const expired = await bookingRepository.cancelExpiredLockedBookings(client, batchSize);
    const completed = await bookingRepository.completeDueConfirmedBookings(client, batchSize);

    return {
      expiredBookings: expired,
      completedBookings: completed
    };
  });

  if (expiredBookings.length === 0 && completedBookings.length === 0) {
    return {
      expiredCount: 0,
      completedCount: 0
    };
  }

  await Promise.all(
    [...expiredBookings, ...completedBookings].map(async (booking) => {
      if (booking.lock_key && booking.lock_token) {
        await lockService.releaseLock(booking.lock_key, booking.lock_token);
      }

      emitSlotUpdated(toSlotUpdatedPayload(booking));
    })
  );

  return {
    expiredCount: expiredBookings.length,
    completedCount: completedBookings.length
  };
}

module.exports = {
  expireLockedBookings
};
