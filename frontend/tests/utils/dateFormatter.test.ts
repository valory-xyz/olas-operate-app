import { formatDate } from '../../utils/dateFormatter';

const expectedFormat = (timeInMs: number) =>
  Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'long',
  }).format(new Date(timeInMs));

describe('formatDate', () => {
  it('returns null for timeInMs of 0', () => {
    expect(formatDate(0)).toBeNull();
  });

  it('formats Jan 11, 2025 16:17:13 UTC exactly', () => {
    const timestamp = Date.UTC(2025, 0, 11, 16, 17, 13);
    expect(formatDate(timestamp)).toBe(expectedFormat(timestamp));
  });

  it('formats Sep 9, 2001 01:46:40 UTC exactly', () => {
    const timestamp = Date.UTC(2001, 8, 9, 1, 46, 40);
    expect(formatDate(timestamp)).toBe(expectedFormat(timestamp));
  });

  it('formats midnight Dec 31, 2024 exactly', () => {
    const timestamp = Date.UTC(2024, 11, 31, 0, 0, 0);
    expect(formatDate(timestamp)).toBe(expectedFormat(timestamp));
  });
});
