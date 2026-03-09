const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { env } = require('./src/config/env');
const { pool } = require('./src/config/db');
const { connectRedis, redisClient } = require('./src/config/redis');
const { runMigrations } = require('./src/db/migrate');
const { initSocket } = require('./src/sockets');
const routes = require('./src/routes');
const errorMiddleware = require('./src/middleware/error.middleware');
const { startBookingExpiryJob, stopBookingExpiryJob } = require('./src/jobs/booking-expiry.job');

async function bootstrap() {
  const app = express();

  app.use(
    cors({
      origin: env.APP_ORIGIN.split(',').map((item) => item.trim()),
      credentials: true
    })
  );
  app.use(morgan('dev'));

  app.use('/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  app.use('/', routes);
  app.use(errorMiddleware);

  const server = http.createServer(app);
  initSocket(server);

  await runMigrations();
  await connectRedis();

  server.listen(env.PORT, () => {
    console.log(`[server] listening on port ${env.PORT}`);
  });

  startBookingExpiryJob();

  const shutdown = async () => {
    console.log('[server] graceful shutdown started');
    stopBookingExpiryJob();

    server.close(async () => {
      try {
        if (redisClient.isOpen) {
          await redisClient.quit();
        }
      } catch (error) {
        console.error('[server] redis shutdown error', error);
      }

      try {
        await pool.end();
      } catch (error) {
        console.error('[server] db shutdown error', error);
      }

      console.log('[server] shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('[server] startup failed', error);
  process.exit(1);
});
