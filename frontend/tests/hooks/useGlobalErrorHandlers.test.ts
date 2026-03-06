import { renderHook } from '@testing-library/react';

import { useGlobalErrorHandlers } from '../../hooks/useGlobalErrorHandlers';

// jsdom doesn't have PromiseRejectionEvent — polyfill for tests
class PromiseRejectionEventPolyfill extends Event {
  readonly promise: Promise<unknown>;
  readonly reason: unknown;
  constructor(
    type: string,
    init: { promise: Promise<unknown>; reason: unknown },
  ) {
    super(type);
    this.promise = init.promise;
    this.reason = init.reason;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).PromiseRejectionEvent = PromiseRejectionEventPolyfill;

describe('useGlobalErrorHandlers', () => {
  let addEventSpy: jest.SpyInstance;
  let removeEventSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventSpy = jest.spyOn(window, 'addEventListener');
    removeEventSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventSpy.mockRestore();
    removeEventSpy.mockRestore();
  });

  it('does not attach listeners when nextLogError is undefined', () => {
    renderHook(() => useGlobalErrorHandlers(undefined));
    expect(addEventSpy).not.toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    );
    expect(addEventSpy).not.toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    );
  });

  it('attaches error and unhandledrejection listeners', () => {
    const logger = jest.fn();
    renderHook(() => useGlobalErrorHandlers(logger));

    expect(addEventSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addEventSpy).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    );
  });

  it('removes listeners on unmount', () => {
    const logger = jest.fn();
    const { unmount } = renderHook(() => useGlobalErrorHandlers(logger));
    unmount();

    expect(removeEventSpy).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    );
    expect(removeEventSpy).toHaveBeenCalledWith(
      'unhandledrejection',
      expect.any(Function),
    );
  });

  it('calls nextLogError with Error and metadata on window error', () => {
    const logger = jest.fn();
    renderHook(() => useGlobalErrorHandlers(logger));

    const error = new Error('test error');
    const event = new ErrorEvent('error', {
      error,
      message: 'test error',
      filename: 'app.js',
      lineno: 42,
      colno: 7,
    });
    window.dispatchEvent(event);

    expect(logger).toHaveBeenCalledWith(error, {
      type: 'unhandled-error',
      filename: 'app.js',
      lineno: 42,
      stack: error.stack,
      colno: 7,
    });
  });

  it('creates Error from message when event.error is falsy', () => {
    const logger = jest.fn();
    renderHook(() => useGlobalErrorHandlers(logger));

    const event = new ErrorEvent('error', {
      error: null,
      message: 'Script error.',
      filename: '',
      lineno: 0,
      colno: 0,
    });
    window.dispatchEvent(event);

    expect(logger).toHaveBeenCalledTimes(1);
    const [err] = logger.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Script error.');
  });

  it('calls nextLogError on unhandled promise rejection with Error reason', () => {
    const logger = jest.fn();
    renderHook(() => useGlobalErrorHandlers(logger));

    const reason = new Error('promise failed');
    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason,
    });
    window.dispatchEvent(event);

    expect(logger).toHaveBeenCalledWith(reason, {
      type: 'unhandled-rejection',
      reason,
    });
  });

  it('wraps non-Error rejection reason in an Error', () => {
    const logger = jest.fn();
    renderHook(() => useGlobalErrorHandlers(logger));

    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: 'string reason',
    });
    window.dispatchEvent(event);

    expect(logger).toHaveBeenCalledTimes(1);
    const [err, info] = logger.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('string reason');
    expect(info).toEqual({
      type: 'unhandled-rejection',
      reason: 'string reason',
    });
  });
});
