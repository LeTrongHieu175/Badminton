const { assertISODate, dateDiffInDaysInclusive } = require('../src/utils/date-time');
const { buildLockKey } = require('../src/services/lock.service');

describe('date-time utils', () => {
  test('assertISODate does not throw for valid dates', () => {
    expect(() => assertISODate('2026-03-09')).not.toThrow();
  });

  test('assertISODate throws for invalid dates', () => {
    expect(() => assertISODate('09-03-2026')).toThrow();
  });

  test('dateDiffInDaysInclusive returns inclusive date span', () => {
    expect(dateDiffInDaysInclusive('2026-03-01', '2026-03-03')).toBe(3);
  });
});

describe('lock service', () => {
  test('buildLockKey follows required format', () => {
    expect(buildLockKey(5, 9, '2026-03-20')).toBe('lock:court:5:slot:9:date:2026-03-20');
  });
});
