import { isNumber } from 'lodash';

import { NA } from '@/constants/symbols';

const MILLISECONDS_IN_A_DAY = 24 * 3600 * 1000;
const MILLISECONDS_IN_AN_HOUR = 3600 * 1000;
const MILLISECONDS_IN_A_MINUTE = 60 * 1000;

export const getTimeAgo = (timestampInSeconds: number) => {
  if (!isNumber(timestampInSeconds)) return null;

  const now = new Date();
  const timeDifference =
    now.getTime() - new Date(timestampInSeconds * 1000).getTime();

  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  } else if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (minutes > 0) {
    return minutes === 1 ? '1 min ago' : `${minutes} mins ago`;
  } else {
    return 'Few secs ago';
  }
};

/**
 * @returns formatted date in the format of 'MMM DD'
 * @example 1626825600 => 'Jul 21'
 */
export const formatToMonthDay = (timeInMs: number) => {
  if (!isNumber(timeInMs)) return '--';
  return new Date(timeInMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * @returns formatted time in the format of 'HH:MM AM/PM'
 * @example 1626825600 => '12:00 PM'
 */
export const formatToTime = (timeInMs: number) => {
  if (!isNumber(timeInMs)) return '--';
  return new Date(timeInMs).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'UTC',
  });
};

/**
 *
 * @returns formatted date and time in the format of 'MMM DD, HH:MM AM/PM'
 * @example 1626825600 => 'Jul 21, 12:00 PM'
 */
export const formatToShortDateTime = (timeInMs?: number) => {
  if (!isNumber(timeInMs)) return '--';
  return new Date(timeInMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'UTC',
  });
};

/**
 * @returns formatted time remaining in the format of 'X days Y hours Z minutes'
 * @example 1626825600 => '1 day 2 hours 30 minutes'
 */
export const formatTimeRemainingFromNow = (
  futureTimestampInSeconds: number,
) => {
  if (!isNumber(futureTimestampInSeconds)) return NA;

  const now = new Date().getTime();
  const targetTime = futureTimestampInSeconds * 1000 + Date.now();
  const timeDifference = targetTime - now;

  if (timeDifference <= 0) return 'Time has passed';

  const days = Math.floor(timeDifference / MILLISECONDS_IN_A_DAY);
  const hours = Math.floor(
    (timeDifference % MILLISECONDS_IN_A_DAY) / MILLISECONDS_IN_AN_HOUR,
  );
  const minutes = Math.floor(
    (timeDifference % MILLISECONDS_IN_AN_HOUR) / MILLISECONDS_IN_A_MINUTE,
  );

  const daysInWords = `${days} day${days !== 1 ? 's' : ''}`;
  const hoursInWords = `${hours} hour${hours !== 1 ? 's' : ''}`;
  const minutesInWords = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${daysInWords} ${hoursInWords} ${minutesInWords}`.trim();
};
