function errorMiddleware(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.message || 'Unexpected server error';

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: error.details || null
    }
  });
}

module.exports = errorMiddleware;
