/**
 * Frontend logging utilities for structured event logging.
 * All logs are routed to nextLogger (renderer/Next logs) via IPC.
 * No user identifiable information is included in logs.
 */

/**
 * Minimal event schema for FE logging.
 * All fields are non-sensitive and do not include user addresses, IDs, or personal data.
 */
export type FEEventName =
  | 'nav:screen'
  | 'ui:error'
  | 'ui:warn'
  | 'ui:notification'
  | 'funding:transak'
  | 'funding:bridge'
  | 'auth:web3'
  | 'app:boot'
  | 'app:loaded'
  | 'app:ready';

export type FESeverity = 'info' | 'warn' | 'error';

export type FEOutcome =
  | 'started'
  | 'success'
  | 'failure'
  | 'pending'
  | 'cancelled';

export type FELogCode =
  | 'UI_ERROR'
  | 'TRANSAK_ORDER_FAILED'
  | 'BRIDGE_ERROR'
  | 'AUTH_FAILED'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export type FELogEvent = {
  /** Event name: nav:screen, ui:error, ui:warn, ui:notification, funding:transak, etc. */
  event: FEEventName;
  /** Screen or route name (e.g., 'login', 'wallet', 'agent-view', 'onramp', 'web3auth') */
  screen?: string;
  /** Severity level: info, warn, error */
  severity?: FESeverity;
  /** Error code or category (e.g., 'TRANSAK_ORDER_FAILED', 'BRIDGE_ERROR') */
  code?: FELogCode;
  /** Outcome status for multi-step flows (e.g., 'started', 'success', 'failure') */
  outcome?: FEOutcome;
  /** Optional descriptive message (no PII) */
  message?: string;
};

/**
 * Converts a log event to JSON string for IPC transmission.
 */
const eventToString = (event: FELogEvent): string => JSON.stringify(event);

/**
 * Sends a log event to the Electron main process for recording in nextLogger.
 * This is safe to call even before the API is ready; it will gracefully fail.
 */
export const logEvent = async (
  event: FELogEvent,
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  if (!nextLogEvent) {
    // Event not yet ready, silently skip
    return;
  }

  try {
    await nextLogEvent(eventToString(event));
  } catch (e) {
    // Silently fail to avoid breaking the app if logging fails
    console.error('Failed to log FE event:', e);
  }
};

/**
 * Logs a navigation event when user navigates to a screen/route.
 * @param screen - Screen name (e.g., 'login', 'wallet', 'agent-view')
 * @param nextLogEvent - Function to send events to IPC
 */
export const logNavigation = async (
  params: { screen: string },
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  await logEvent(
    {
      event: 'nav:screen',
      screen: params.screen,
      severity: 'info',
    },
    nextLogEvent,
  );
};

/**
 * Logs a UI error/exception shown to user.
 * @param screen - Current screen name
 * @param code - Error code or category
 * @param message - Optional error message (no PII)
 * @param nextLogEvent - Function to send events to IPC
 */
export const logUIError = async (
  params: { screen: string; code: FELogCode; message?: string },
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  await logEvent(
    {
      event: 'ui:error',
      screen: params.screen,
      severity: 'error',
      code: params.code,
      message: params.message,
    },
    nextLogEvent,
  );
};

/**
 * Logs a UI warning or alert shown to user.
 * @param screen - Current screen name
 * @param message - Optional warning message (no PII)
 * @param nextLogEvent - Function to send events to IPC
 */
export const logUIWarning = async (
  params: { screen: string; message?: string },
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  await logEvent(
    {
      event: 'ui:warn',
      screen: params.screen,
      severity: 'warn',
      message: params.message,
    },
    nextLogEvent,
  );
};

/**
 * Logs a UI notification (informational message) shown to user.
 * @param screen - Current screen name
 * @param message - Optional notification message (no PII)
 * @param nextLogEvent - Function to send events to IPC
 */
export const logUINotification = async (
  params: { screen: string; message?: string },
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  await logEvent(
    {
      event: 'ui:notification',
      screen: params.screen,
      severity: 'info',
      message: params.message,
    },
    nextLogEvent,
  );
};

/**
 * Logs funding/on-ramp flow events.
 * @param outcome - Event outcome (started, success, failure, etc.)
 * @param code - Error code if failure (e.g., 'TRANSAK_ERROR', 'USER_CANCELLED')
 * @param message - Optional message (no PII)
 * @param nextLogEvent - Function to send events to IPC
 */
export const logFundingEvent = async (
  params: {
    outcome: FEOutcome;
    code?: FELogCode;
    message?: string;
    screen?: string;
  },
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  await logEvent(
    {
      event: 'funding:transak',
      screen: params.screen ?? 'onramp',
      severity: params.outcome === 'failure' ? 'error' : 'info',
      outcome: params.outcome,
      code: params.code,
      message: params.message,
    },
    nextLogEvent,
  );
};

/**
 * Logs bridging flow events.
 * @param outcome - Event outcome (started, success, failure, etc.)
 * @param code - Error code if failure (e.g., 'BRIDGE_ERROR')
 * @param message - Optional message (no PII)
 * @param nextLogEvent - Function to send events to IPC
 */
export const logBridgeEvent = async (
  params: {
    outcome: FEOutcome;
    code?: FELogCode;
    message?: string;
    screen?: string;
  },
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  await logEvent(
    {
      event: 'funding:bridge',
      screen: params.screen,
      severity: params.outcome === 'failure' ? 'error' : 'info',
      outcome: params.outcome,
      code: params.code,
      message: params.message,
    },
    nextLogEvent,
  );
};

/**
 * Logs web3auth flow events.
 * @param outcome - Event outcome (started, success, failure, etc.)
 * @param code - Error code if failure
 * @param message - Optional message (no PII)
 * @param nextLogEvent - Function to send events to IPC
 */
export const logWeb3AuthEvent = async (
  params: {
    outcome: FEOutcome;
    code?: FELogCode;
    message?: string;
    screen?: string;
  },
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  await logEvent(
    {
      event: 'auth:web3',
      screen: params.screen ?? 'web3auth',
      severity: params.outcome === 'failure' ? 'error' : 'info',
      outcome: params.outcome,
      code: params.code,
      message: params.message,
    },
    nextLogEvent,
  );
};

/**
 * Logs app lifecycle events.
 * @param stage - App stage (boot, loaded, ready)
 * @param message - Optional message (no PII)
 * @param nextLogEvent - Function to send events to IPC
 */
export const logAppLifecycle = async (
  params: { stage: 'boot' | 'loaded' | 'ready'; message?: string },
  nextLogEvent?: (message: string) => Promise<void>,
): Promise<void> => {
  await logEvent(
    {
      event: `app:${params.stage}` as FEEventName,
      severity: 'info',
      message: params.message,
    },
    nextLogEvent,
  );
};
