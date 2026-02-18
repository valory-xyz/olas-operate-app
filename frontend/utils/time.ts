import { isNumber } from 'lodash';

export const ONE_DAY_IN_S = 24 * 60 * 60;
export const ONE_DAY_IN_MS = ONE_DAY_IN_S * 1000;
export const ONE_MINUTE_IN_MS = 60 * 1000;

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
    timeZone: 'UTC',
  });
};

/**
 * returns formatted date in the format of 'Month YYYY'
 * @example 1626825600000 => 'July 2021'
 */
export const formatToMonthYear = (timeInMs: number) => {
  if (!isNumber(timeInMs)) return '--';
  return new Date(timeInMs).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
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
 *
 * @param totalSeconds - total seconds to be formatted
 * @returns formatted string in the format of 'X days X hours X minutes X seconds'
 * @example 100000 => '1 day 3 hours 46 minutes 40 seconds'
 */
export const formatCountdownDisplay = (totalSeconds: number) => {
  const days = Math.floor(totalSeconds / (24 * 3600));
  totalSeconds %= 24 * 3600;

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Ensure double digits for hours, minutes, and seconds
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  const daysInWords = `${days} day${days !== 1 ? 's' : ''}`;
  const hoursInWords = `${formattedHours} hour${hours !== 1 ? 's' : ''}`;
  const minutesInWords = `${formattedMinutes} minute${minutes !== 1 ? 's' : ''}`;
  const secondsInWords = `${formattedSeconds} second${seconds !== 1 ? 's' : ''}`;
  return `${daysInWords} ${hoursInWords} ${minutesInWords} ${secondsInWords}`.trim();
};

/**
 * @returns hours from seconds
 * @example 86400 => '24 hours'
 */
export const secondsToHours = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
};
