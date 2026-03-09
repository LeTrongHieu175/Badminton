function sendSuccess(res, data = {}, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = {
  sendSuccess,
  asyncHandler
};
