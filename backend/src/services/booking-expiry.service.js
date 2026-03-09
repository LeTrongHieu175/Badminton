const { withTransaction } = require('../config/db');
const bookingRepository = require('../repositories/booking.repository');
const lockService = require('./lock.service');
const { emitSlotUpdated } = require('../sockets/booking.socket');
const { toSlotUpdatedPayload } = require('./booking.service');

async function expireLockedBookings(batchSize = 100) {
  const expiredBookings = await withTransaction(async (client) => {
    return bookingRepository.cancelExpiredLockedBookings(client, batchSize);
  });

  if (expiredBookings.length === 0) {
    return 0;
  }

  await Promise.all(
    expiredBookings.map(async (booking) => {
      if (booking.lock_key && booking.lock_token) {
        await lockService.releaseLock(booking.lock_key, booking.lock_token);
      }

      emitSlotUpdated(toSlotUpdatedPayload(booking));
    })
  );

  return expiredBookings.length;
}

module.exports = {
  expireLockedBookings
};
