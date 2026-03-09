const { Server } = require('socket.io');
const { env } = require('../config/env');
const { setIO } = require('../config/socket');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.SOCKET_CORS_ORIGIN.split(',').map((item) => item.trim()),
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('subscribe_court', (courtId) => {
      socket.join(`court:${courtId}`);
    });

    socket.on('unsubscribe_court', (courtId) => {
      socket.leave(`court:${courtId}`);
    });
  });

  setIO(io);
  return io;
}

module.exports = {
  initSocket
};
