import {
  formatCountdownDisplay,
  formatToMonthDay,
  formatToMonthYear,
  formatToShortDateTime,
  formatToTime,
  getTimeAgo,
  ONE_DAY_IN_MS,
  ONE_DAY_IN_S,
  ONE_MINUTE_IN_MS,
  secondsToHours,
} from '../../utils/time';

describe('constants', () => {
  it('ONE_DAY_IN_S is 86400', () => {
    expect(ONE_DAY_IN_S).toBe(86400);
  });

  it('ONE_DAY_IN_MS is 86400000', () => {
    expect(ONE_DAY_IN_MS).toBe(86400000);
  });

  it('ONE_MINUTE_IN_MS is 60000', () => {
    expect(ONE_MINUTE_IN_MS).toBe(60000);
  });
});

describe('getTimeAgo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Fix current time to 2024-01-15T12:00:00Z
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Few secs ago" for timestamps within the last minute', () => {
    const now = Date.now() / 1000;
    expect(getTimeAgo(now - 30)).toBe('Few secs ago');
  });

  it('returns "1 min ago" for exactly 1 minute ago', () => {
    const now = Date.now() / 1000;
    expect(getTimeAgo(now - 60)).toBe('1 min ago');
  });

  it('returns "X mins ago" for multiple minutes', () => {
    const now = Date.now() / 1000;
    expect(getTimeAgo(now - 300)).toBe('5 mins ago');
  });

  it('returns "1 hour ago" for exactly 1 hour ago', () => {
    const now = Date.now() / 1000;
    expect(getTimeAgo(now - 3600)).toBe('1 hour ago');
  });

  it('returns "X hours ago" for multiple hours', () => {
    const now = Date.now() / 1000;
    expect(getTimeAgo(now - 7200)).toBe('2 hours ago');
  });

  it('returns "1 day ago" for exactly 1 day ago', () => {
    const now = Date.now() / 1000;
    expect(getTimeAgo(now - 86400)).toBe('1 day ago');
  });

  it('returns "X days ago" for multiple days', () => {
    const now = Date.now() / 1000;
    expect(getTimeAgo(now - 172800)).toBe('2 days ago');
  });

  it('returns null for non-number input', () => {
    // @ts-expect-error Testing non-number input
    expect(getTimeAgo('not a number')).toBeNull();
    // @ts-expect-error Testing non-number input
    expect(getTimeAgo(undefined)).toBeNull();
  });
});

describe('formatToMonthDay', () => {
  it('formats timestamp to "MMM DD" in UTC', () => {
    // July 21, 2021 00:00:00 UTC
    const timestamp = Date.UTC(2021, 6, 21);
    expect(formatToMonthDay(timestamp)).toBe('Jul 21');
  });

  it('returns "--" for non-number input', () => {
    // @ts-expect-error Testing non-number input
    expect(formatToMonthDay(undefined)).toBe('--');
    // @ts-expect-error Testing non-number input
    expect(formatToMonthDay('string')).toBe('--');
  });
});

describe('formatToMonthYear', () => {
  it('formats timestamp to "Month YYYY" in UTC', () => {
    const timestamp = Date.UTC(2021, 6, 21);
    expect(formatToMonthYear(timestamp)).toBe('July 2021');
  });

  it('returns "--" for non-number input', () => {
    // @ts-expect-error Testing non-number input
    expect(formatToMonthYear(undefined)).toBe('--');
  });
});

describe('formatToTime', () => {
  it('formats timestamp to time in UTC', () => {
    // July 21, 2021 14:30 UTC
    const timestamp = Date.UTC(2021, 6, 21, 14, 30);
    expect(formatToTime(timestamp)).toBe('2:30 PM');
  });

  it('returns "--" for non-number input', () => {
    // @ts-expect-error Testing non-number input
    expect(formatToTime(undefined)).toBe('--');
  });
});

describe('formatToShortDateTime', () => {
  it('formats timestamp to "MMM DD, HH:MM AM/PM" in UTC', () => {
    const timestamp = Date.UTC(2021, 6, 21, 12, 0);
    expect(formatToShortDateTime(timestamp)).toBe('Jul 21, 12:00 PM');
  });

  it('returns "--" for undefined', () => {
    expect(formatToShortDateTime(undefined)).toBe('--');
  });

  it('returns "--" for non-number input', () => {
    // @ts-expect-error Testing non-number input
    expect(formatToShortDateTime('string')).toBe('--');
  });
});

describe('formatCountdownDisplay', () => {
  it('formats 100000 seconds correctly', () => {
    expect(formatCountdownDisplay(100000)).toBe(
      '1 day 03 hours 46 minutes 40 seconds',
    );
  });

  it('formats exactly 1 day', () => {
    expect(formatCountdownDisplay(86400)).toBe(
      '1 day 00 hours 00 minutes 00 seconds',
    );
  });

  it('formats 0 seconds', () => {
    expect(formatCountdownDisplay(0)).toBe(
      '0 days 00 hours 00 minutes 00 seconds',
    );
  });

  it('formats 1 second', () => {
    expect(formatCountdownDisplay(1)).toBe(
      '0 days 00 hours 00 minutes 01 second',
    );
  });

  it('formats 1 hour 1 minute 1 second', () => {
    expect(formatCountdownDisplay(3661)).toBe(
      '0 days 01 hour 01 minute 01 second',
    );
  });

  it('uses singular for exactly 1 of each unit', () => {
    // 1 day, 1 hour, 1 minute, 1 second = 90061
    expect(formatCountdownDisplay(90061)).toBe(
      '1 day 01 hour 01 minute 01 second',
    );
  });
});

describe('secondsToHours', () => {
  it('converts 3600 seconds to "1 hour"', () => {
    expect(secondsToHours(3600)).toBe('1 hour');
  });

  it('converts 86400 seconds to "24 hours"', () => {
    expect(secondsToHours(86400)).toBe('24 hours');
  });

  it('converts 0 seconds to "0 hours"', () => {
    expect(secondsToHours(0)).toBe('0 hours');
  });

  it('floors partial hours', () => {
    expect(secondsToHours(5000)).toBe('1 hour');
    expect(secondsToHours(7199)).toBe('1 hour');
    expect(secondsToHours(7200)).toBe('2 hours');
  });
});
