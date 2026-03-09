const ApiError = require('../utils/api-error');

function roleMiddleware(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions', 'FORBIDDEN'));
    }

    return next();
  };
}

module.exports = roleMiddleware;
