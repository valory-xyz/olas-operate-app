/**
 * Shared mock factories for auto-run test files.
 *
 * Consolidates repeated jest.mock patterns (sleepAwareDelay, withTimeout,
 * useAutoRunVerboseLogger) and a common "delay module" accessor so each
 * test file only needs to import helpers instead of duplicating mock blocks.
 *
 * NOTE: jest.mock() calls must remain **in the test file** — they are hoisted
 * by Jest at compile time and cannot be delegated to a helper. This file only
 * provides the *factory functions* passed to jest.mock().
 */

/**
 * Factory for `jest.mock('…/utils/delay')`.
 * Usage:
 * ```ts
 * jest.mock('…/utils/delay', () => delayMockFactory());
 * // also: jest.mock('…/utils/delay', () => delayMockFactoryWithTimeout());
 * ```
 */
export const delayMockFactory = () => ({
  sleepAwareDelay: jest.fn().mockResolvedValue(true),
});

export const delayMockFactoryWithTimeout = () => ({
  sleepAwareDelay: jest.fn().mockResolvedValue(true),
  withTimeout: jest.fn(),
});

/**
 * Factory for `jest.mock('…/hooks/useAutoRunVerboseLogger')`.
 * Usage:
 * ```ts
 * jest.mock('…/hooks/useAutoRunVerboseLogger', () => verboseLoggerMockFactory());
 * ```
 */
export const verboseLoggerMockFactory = () => ({
  useAutoRunVerboseLogger: (logMessage: (msg: string) => void) => logMessage,
});
