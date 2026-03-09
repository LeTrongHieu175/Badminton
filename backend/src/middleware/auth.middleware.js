const ApiError = require('../utils/api-error');
const { verifyAccessToken } = require('../utils/jwt');

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or invalid Authorization header', 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };
    return next();
  } catch (_error) {
    return next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }
}

module.exports = authMiddleware;
