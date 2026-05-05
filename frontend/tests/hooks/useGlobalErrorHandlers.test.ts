import { renderHook } from '@testing-library/react';

import { useGlobalErrorHandlers } from '../../hooks/useGlobalErrorHandlers';

/**
 * jsdom lacks PromiseRejectionEvent. Polyfill for testing.
 */
class PromiseRejectionEvent extends Event {
  reason: unknown;
  constructor(type: string, init: { reason: unknown }) {
    super(type);
    this.reason = init.reason;
  }
}

// Make it available globally for the handler
Object.defineProperty(window, 'PromiseRejectionEvent', {
  value: PromiseRejectionEvent,
  writable: true,
  configurable: true,
});

describe('useGlobalErrorHandlers', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('does nothing when nextLogError is undefined', () => {
    renderHook(() => useGlobalErrorHandlers(undefined));

    // Should not register any listeners
    const errorCalls = addEventListenerSpy.mock.calls.filter(
      ([type]: [string]) => type === 'error' || type === 'unhandledrejection',
    );
    expect(errorCalls).toHaveLength(0);
  });

  it('registers error and unhandledrejection listeners when nextLogError is provided', () => {
    const mockLogError = jest.fn();

    renderHook(() => useGlobalErrorHandlers(mockLogError));

    const registeredTypes = addEventListenerSpy.mock.calls.map(
      ([type]: [string]) => type,
    );
    expect(registeredTypes).toContain('error');
    expect(registeredTypes).toContain('unhandledrejection');
  });

  it('calls nextLogError on window error event with correct metadata', () => {
    const mockLogError = jest.fn();

    renderHook(() => useGlobalErrorHandlers(mockLogError));

    const testError = new Error('Test unhandled error');
    const errorEvent = new ErrorEvent('error', {
      error: testError,
      message: 'Test unhandled error',
      filename: 'test.js',
      lineno: 42,
      colno: 10,
    });

    window.dispatchEvent(errorEvent);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith(testError, {
      type: 'unhandled-error',
      filename: 'test.js',
      lineno: 42,
      colno: 10,
      stack: testError.stack,
    });
  });

  it('creates a new Error from message when event.error is falsy', () => {
    const mockLogError = jest.fn();

    renderHook(() => useGlobalErrorHandlers(mockLogError));

    const errorEvent = new ErrorEvent('error', {
      error: null,
      message: 'Script error.',
      filename: 'unknown.js',
      lineno: 0,
      colno: 0,
    });

    window.dispatchEvent(errorEvent);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [error, metadata] = mockLogError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Script error.');
    expect(metadata.type).toBe('unhandled-error');
  });

  it('calls nextLogError on unhandled rejection with Error reason', () => {
    const mockLogError = jest.fn();

    renderHook(() => useGlobalErrorHandlers(mockLogError));

    const rejectionError = new Error('Promise rejected');
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      reason: rejectionError,
    });

    window.dispatchEvent(rejectionEvent);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith(rejectionError, {
      type: 'unhandled-rejection',
      reason: rejectionError,
    });
  });

  it('wraps non-Error reason in a new Error on unhandled rejection', () => {
    const mockLogError = jest.fn();

    renderHook(() => useGlobalErrorHandlers(mockLogError));

    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      reason: 'string rejection reason',
    });

    window.dispatchEvent(rejectionEvent);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    const [error, metadata] = mockLogError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('string rejection reason');
    expect(metadata).toEqual({
      type: 'unhandled-rejection',
      reason: 'string rejection reason',
    });
  });

  it('wraps numeric reason in a new Error on unhandled rejection', () => {
    const mockLogError = jest.fn();

    renderHook(() => useGlobalErrorHandlers(mockLogError));

    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      reason: 404,
    });

    window.dispatchEvent(rejectionEvent);

    const [error] = mockLogError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('404');
  });

  it('removes listeners on unmount', () => {
    const mockLogError = jest.fn();

    const { unmount } = renderHook(() => useGlobalErrorHandlers(mockLogError));

    unmount();

    const removedTypes = removeEventListenerSpy.mock.calls.map(
      ([type]: [string]) => type,
    );
    expect(removedTypes).toContain('error');
    expect(removedTypes).toContain('unhandledrejection');
  });

  it('removes the exact same handler references that were added', () => {
    const mockLogError = jest.fn();

    const { unmount } = renderHook(() => useGlobalErrorHandlers(mockLogError));

    // Capture the handler references that were added
    const addedErrorHandler = addEventListenerSpy.mock.calls.find(
      ([type]: [string]) => type === 'error',
    )?.[1];
    const addedRejectionHandler = addEventListenerSpy.mock.calls.find(
      ([type]: [string]) => type === 'unhandledrejection',
    )?.[1];

    expect(addedErrorHandler).toBeDefined();
    expect(addedRejectionHandler).toBeDefined();

    unmount();

    // Verify the same references were removed
    const removedErrorHandler = removeEventListenerSpy.mock.calls.find(
      ([type]: [string]) => type === 'error',
    )?.[1];
    const removedRejectionHandler = removeEventListenerSpy.mock.calls.find(
      ([type]: [string]) => type === 'unhandledrejection',
    )?.[1];

    expect(removedErrorHandler).toBe(addedErrorHandler);
    expect(removedRejectionHandler).toBe(addedRejectionHandler);
  });

  it('re-registers listeners when nextLogError changes from undefined to a function', () => {
    const { rerender } = renderHook(
      ({ logger }) => useGlobalErrorHandlers(logger),
      { initialProps: { logger: undefined as (() => void) | undefined } },
    );

    const callCountBeforeRerender = addEventListenerSpy.mock.calls.filter(
      ([type]: [string]) => type === 'error',
    ).length;
    expect(callCountBeforeRerender).toBe(0);

    const mockLogError = jest.fn();
    rerender({ logger: mockLogError });

    const callCountAfterRerender = addEventListenerSpy.mock.calls.filter(
      ([type]: [string]) => type === 'error',
    ).length;
    expect(callCountAfterRerender).toBe(1);
  });
});
