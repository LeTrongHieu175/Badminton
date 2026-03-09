const { getIO } = require('../config/socket');

function emitSlotUpdated(payload) {
  const io = getIO();
  if (!io) {
    return;
  }

  io.emit('slot_updated', payload);
}

module.exports = {
  emitSlotUpdated
};
