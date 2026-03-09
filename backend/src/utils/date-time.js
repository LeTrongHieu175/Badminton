const ApiError = require('./api-error');

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function assertISODate(dateString, field = 'date') {
  if (!ISO_DATE_REGEX.test(dateString)) {
    throw new ApiError(400, `${field} must follow YYYY-MM-DD format`, 'VALIDATION_ERROR');
  }

  const parsed = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${field} is invalid`, 'VALIDATION_ERROR');
  }
}

function addSeconds(date, seconds) {
  return new Date(date.getTime() + seconds * 1000);
}

function dateDiffInDaysInclusive(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

module.exports = {
  assertISODate,
  addSeconds,
  dateDiffInDaysInclusive
};
