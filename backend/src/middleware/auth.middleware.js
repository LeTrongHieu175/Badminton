const ApiError = require('../utils/api-error');
const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');

async function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or invalid Authorization header', 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (_error) {
    return next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }

  try {
    const user = await userRepository.findByIdWithAuth(payload.id);
    if (!user) {
      return next(new ApiError(401, 'User does not exist', 'UNAUTHORIZED'));
    }

    if (!user.is_active) {
      return next(new ApiError(403, 'User account is deactivated', 'USER_DEACTIVATED'));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authMiddleware;
