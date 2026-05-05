import { getErrorMessage, parseApiError } from '../../utils/error';

describe('parseApiError', () => {
  it('throws with error field from response JSON', async () => {
    const response = {
      json: jest.fn().mockResolvedValue({ error: 'Invalid token' }),
    } as unknown as Response;

    await expect(parseApiError(response)).rejects.toThrow('Invalid token');
  });

  it('throws with message field from response JSON', async () => {
    const response = {
      json: jest.fn().mockResolvedValue({ message: 'Not found' }),
    } as unknown as Response;

    await expect(parseApiError(response)).rejects.toThrow('Not found');
  });

  it('prefers error field over message field', async () => {
    const response = {
      json: jest
        .fn()
        .mockResolvedValue({ error: 'Error text', message: 'Message text' }),
    } as unknown as Response;

    await expect(parseApiError(response)).rejects.toThrow('Error text');
  });

  it('throws with fallback message when JSON has no error or message', async () => {
    const response = {
      json: jest.fn().mockResolvedValue({ code: 500 }),
    } as unknown as Response;

    await expect(parseApiError(response)).rejects.toThrow(
      'Something went wrong',
    );
  });

  it('throws with custom fallback message', async () => {
    const response = {
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response;

    await expect(parseApiError(response, 'Custom fallback')).rejects.toThrow(
      'Custom fallback',
    );
  });

  it('throws with fallback when JSON parsing fails', async () => {
    const response = {
      json: jest.fn().mockRejectedValue(new Error('parse error')),
    } as unknown as Response;

    await expect(parseApiError(response)).rejects.toThrow(
      'Something went wrong',
    );
  });
});

describe('getErrorMessage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns message from Error instance', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error');
  });

  it('returns default fallback for non-Error values', () => {
    expect(getErrorMessage('string error')).toBe('Something went wrong');
    expect(getErrorMessage(42)).toBe('Something went wrong');
    expect(getErrorMessage(null)).toBe('Something went wrong');
    expect(getErrorMessage(undefined)).toBe('Something went wrong');
  });

  it('returns custom fallback for non-Error values', () => {
    expect(getErrorMessage('oops', 'Custom message')).toBe('Custom message');
  });

  it('logs the error to console', () => {
    const error = new Error('logged');
    getErrorMessage(error);
    expect(console.error).toHaveBeenCalledWith(error);
  });
});
