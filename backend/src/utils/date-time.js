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

function formatTimeHHmm(timeValue) {
  const normalized = String(timeValue || '').trim();
  const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) {
    return normalized;
  }

  return `${match[1]}:${match[2]}`;
}

function normalizeISODateOnly(dateValue) {
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    return dateValue.toISOString().slice(0, 10);
  }

  const raw = String(dateValue || '').trim();
  if (!raw) {
    return raw;
  }

  const directMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

function combineDateAndTime(dateString, timeString) {
  const dateOnly = normalizeISODateOnly(dateString);
  return new Date(`${dateOnly}T${formatTimeHHmm(timeString)}:00`);
}

module.exports = {
  assertISODate,
  addSeconds,
  dateDiffInDaysInclusive,
  formatTimeHHmm,
  combineDateAndTime
};
