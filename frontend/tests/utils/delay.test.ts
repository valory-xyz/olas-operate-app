import {
  delayInSeconds,
  sleepAwareDelay,
  withTimeout,
} from '../../utils/delay';

describe('delayInSeconds', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves after the specified number of seconds', async () => {
    const promise = delayInSeconds(2);
    jest.advanceTimersByTime(2000);
    await expect(promise).resolves.toBeUndefined();
  });

  it('does not resolve before the specified time', async () => {
    let resolved = false;
    delayInSeconds(5).then(() => {
      resolved = true;
    });
    jest.advanceTimersByTime(4999);
    // Flush microtasks
    await Promise.resolve();
    expect(resolved).toBe(false);
  });
});

describe('sleepAwareDelay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns true when delay completes without sleep drift', async () => {
    const now = 1000000;
    jest.setSystemTime(now);

    const promise = sleepAwareDelay(5);
    // Advance by exactly 5s — no drift
    jest.advanceTimersByTime(5000);

    const result = await promise;
    expect(result).toBe(true);
  });

  it('returns false when elapsed time indicates sleep occurred', async () => {
    const now = 1000000;
    jest.setSystemTime(now);

    const promise = sleepAwareDelay(5);
    // Advance by 60s — simulates device sleep (way beyond 30s threshold)
    jest.advanceTimersByTime(60000);

    const result = await promise;
    expect(result).toBe(false);
  });

  it('returns true when drift is within threshold', async () => {
    const now = 1000000;
    jest.setSystemTime(now);

    const promise = sleepAwareDelay(5);
    // 5s delay + 29s drift = 34s elapsed (within 30s threshold)
    jest.advanceTimersByTime(34000);

    const result = await promise;
    expect(result).toBe(true);
  });
});

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with operation result when operation completes first', async () => {
    const operation = Promise.resolve('success');
    const result = await withTimeout(
      operation,
      5000,
      () => new Error('timeout'),
    );
    expect(result).toBe('success');
  });

  it('rejects with timeout error when operation takes too long', async () => {
    const operation = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 10000);
    });

    const promise = withTimeout(operation, 1000, () => new Error('Timed out!'));

    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow('Timed out!');
  });

  it('rejects with operation error when operation fails', async () => {
    const operation = Promise.reject(new Error('op failed'));
    await expect(
      withTimeout(operation, 5000, () => new Error('timeout')),
    ).rejects.toThrow('op failed');
  });
});
