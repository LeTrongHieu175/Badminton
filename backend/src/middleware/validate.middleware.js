const ApiError = require('../utils/api-error');

function requireBodyFields(fields) {
  return (req, _res, next) => {
    const missing = fields.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');
    if (missing.length > 0) {
      return next(new ApiError(400, `Missing required body fields: ${missing.join(', ')}`, 'VALIDATION_ERROR'));
    }
    return next();
  };
}

function requireQueryFields(fields) {
  return (req, _res, next) => {
    const missing = fields.filter((field) => req.query[field] === undefined || req.query[field] === null || req.query[field] === '');
    if (missing.length > 0) {
      return next(new ApiError(400, `Missing required query fields: ${missing.join(', ')}`, 'VALIDATION_ERROR'));
    }
    return next();
  };
}

module.exports = {
  requireBodyFields,
  requireQueryFields
};
