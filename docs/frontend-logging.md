# Frontend Logging Documentation

## Overview

The frontend logging system provides structured event logging for navigation, UI notifications/errors, and user flows (funding, bridge, web3auth) without exposing any personally identifiable information (PII). All FE events are routed to `nextLogger` (renderer/Next logs) via IPC, keeping them separate from the verbose `logger.electron` output.

## Architecture

```
Frontend Component
       ↓
useFELogger hook or logFEEvent utilities
       ↓
IPC call to 'next-log-event'
       ↓
Electron main process
       ↓
nextLogger.info() → renderer/Next logs
```

## Minimal Event Schema

All events follow this schema:

```typescript
type FELogEvent = {
  event: string;                    // Event name: 'nav:screen', 'ui:error', 'funding:transak', etc.
  screen?: string;                  // Screen/route name: 'login', 'wallet', 'agent-view', 'onramp', etc.
  severity?: 'info' | 'warn' | 'error';
  code?: string;                    // Error code or category: 'TRANSAK_ERROR', 'BRIDGE_ERROR', 'RENDER_ERROR'
  outcome?: 'started' | 'success' | 'failure' | 'pending' | 'cancelled';
  message?: string;                 // Descriptive message (NO PII - no addresses, IDs, personal data)
  timestamp?: string;               // ISO format timestamp
};
```

## Usage Patterns

### 1. Route Navigation Logging (Automatic)

Routes are automatically logged in `_app.tsx` when the page changes:

```typescript
// _app.tsx handles this automatically
// Log entry: { event: 'nav:screen', screen: 'dashboard', severity: 'info', timestamp: '...' }
// Log entry: { event: 'nav:screen', screen: 'wallet', severity: 'info', timestamp: '...' }
```

No code changes needed; this happens automatically.

### 2. Using the Hook in Components

Import the hook and use the logging functions:

```typescript
import { useFELogger } from '@/hooks/useFELogger';

export const MyComponent = () => {
  const { logUIError, logUIWarning, logUINotification } = useFELogger();

  const handleSubmit = async () => {
    try {
      // ... do something
      await logUINotification('my-screen', 'Action completed successfully');
    } catch (error) {
      await logUIError('my-screen', 'SUBMISSION_ERROR', error.message);
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
};
```

### 3. Wrapping Notifications with Logging

When showing messages to users, use the notification logger wrapper:

```typescript
import { useMessageApi } from '@/context/MessageProvider';
import { useFELogger } from '@/hooks/useFELogger';
import { showErrorWithLogging } from '@/utils/notificationLogger';

export const MyComponent = () => {
  const messageApi = useMessageApi();
  const { logUIError } = useFELogger();

  const handleError = (error: Error) => {
    showErrorWithLogging(
      messageApi,
      'Something went wrong. Please try again.',
      logUIError,
      'my-screen',
      'OPERATION_FAILED'
    );
  };

  return <button onClick={() => handleError(new Error('test'))}>Trigger Error</button>;
};
```

### 4. Funding Flow Logging (On-Ramp)

Example: already implemented in `OnRampIframe.tsx`

```typescript
import { useFELogger } from '@/hooks/useFELogger';

export const OnRampIframe = ({ usdAmountToPay }: Props) => {
  const { logFundingEvent } = useFELogger();

  useEffect(() => {
    // Log start
    logFundingEvent('started', undefined, `Amount: ${usdAmountToPay} USD');
  }, [usdAmountToPay, logFundingEvent]);

  const handleTransakEvent = (eventId: string) => {
    if (eventId === 'TRANSAK_ORDER_SUCCESSFUL') {
      logFundingEvent('success');
    } else if (eventId === 'TRANSAK_ORDER_FAILED') {
      logFundingEvent('failure', 'TRANSAK_ORDER_FAILED', 'Transak order failed');
    } else if (eventId === 'TRANSAK_WIDGET_CLOSE') {
      logFundingEvent('cancelled');
    }
  };
};
```

### 5. Web3Auth Flow Logging

Example: already implemented in `Web3AuthIframe.tsx`

```typescript
import { useFELogger } from '@/hooks/useFELogger';

export const Web3AuthIframe = () => {
  const { logWeb3AuthEvent } = useFELogger();

  useEffect(() => {
    logWeb3AuthEvent('started');
  }, [logWeb3AuthEvent]);

  const handleEvent = (eventId: string) => {
    if (eventId === 'WEB3AUTH_AUTH_SUCCESS') {
      logWeb3AuthEvent('success');
    } else if (eventId === 'WEB3AUTH_MODAL_CLOSED') {
      logWeb3AuthEvent('cancelled');
    }
  };
};
```

### 6. Bridge Flow Logging

```typescript
import { useFELogger } from '@/hooks/useFELogger';

export const BridgeComponent = () => {
  const { logBridgeEvent } = useFELogger();

  const initiateTransfer = async () => {
    try {
      logBridgeEvent('started');
      // ... transfer logic
      logBridgeEvent('success');
    } catch (error) {
      logBridgeEvent('failure', 'BRIDGE_ERROR', error.message);
    }
  };
};
```

### 7. App Lifecycle Logging

```typescript
import { useFELogger } from '@/hooks/useFELogger';

export const MyComponent = () => {
  const { logAppLifecycle } = useFELogger();

  useEffect(() => {
    logAppLifecycle('loaded', 'App initialization complete');
    // Later: logAppLifecycle('ready', 'All data loaded');
  }, [logAppLifecycle]);
};
```

## Available Logging Functions

### From `useFELogger` Hook

- `logEvent(event: FELogEvent)` - Generic event logger
- `logNavigation(screen: string)` - Log screen navigation
- `logUIError(screen: string, code: string, message?: string)` - Log UI error
- `logUIWarning(screen: string, message?: string)` - Log UI warning
- `logUINotification(screen: string, message?: string)` - Log UI notification
- `logFundingEvent(outcome, code?, message?)` - Log on-ramp/funding flow
- `logBridgeEvent(outcome, code?, message?)` - Log bridge flow
- `logWeb3AuthEvent(outcome, code?, message?)` - Log web3auth flow
- `logAppLifecycle(stage, message?)` - Log app lifecycle

### From Direct Imports

```typescript
import {
  logFEEvent,
  logNavigation,
  logUIError,
  logUIWarning,
  logUINotification,
  logFundingEvent,
  logBridgeEvent,
  logWeb3AuthEvent,
  logAppLifecycle,
} from '@/utils/logger';

// Usage: logFEEvent(event, nextLogEvent)
// Usually unnecessary; use useFELogger hook instead
```

### From `notificationLogger` Utilities

```typescript
import {
  showErrorWithLogging,
  showWarningWithLogging,
  showSuccessWithLogging,
  showInfoWithLogging,
} from '@/utils/notificationLogger';

// These automatically show message AND log it
showErrorWithLogging(messageApi, 'Error message', logUIError, 'screen-name', 'ERROR_CODE');
```

## Logged Screens/Routes

Currently logged (automatic or semi-automatic):

- `dashboard` - Main agent dashboard
- `login` - Login/setup screen
- `wallet` - Wallet management screen
- `agent-view` - Individual agent view
- `onramp` - On-ramp/funding window
- `web3auth` - Web3Auth authentication window
- `web3auth-swap-owner` - Swap owner window

Add new routes by:
1. Component uses router and route name is derived from `router.pathname`
2. Automatic logging in `_app.tsx` catches all routes

## Log Location

All FE logs are written to:
- **Development**: `~/.operate/logs/next.log`
- **Production**: Same location

Logs are included in:
- Debug data export (via **Export Logs** button)
- Support bundle export (for error investigation)

## Privacy & Security Notes

✅ **Safe to log:**
- Screen/route names
- Event names and codes
- Error categories (generic codes, not specific error details)
- Flow outcomes (started, success, failure)
- Generic messages (no identifiable data)
- Timestamps

❌ **Never log:**
- User addresses (wallet addresses, safe addresses, etc.)
- User IDs or account identifiers
- Private keys or secrets
- Full error messages with sensitive data
- User input (search queries, form data, etc.)
- IP addresses

Always sanitize error messages before logging. When in doubt, exclude it.

## Error Boundary Integration

The app's error boundary (`ErrorBoundary.tsx`) automatically catches render errors and logs them via `nextLogError`. No additional code needed for error boundary logs.

## Testing

To verify logging works:

1. Open **Export Logs** dialog
2. Check the `next.log` file for your FE events
3. Should see entries like:
   ```
   {"event":"nav:screen","screen":"dashboard","severity":"info","timestamp":"2026-02-04T..."}
   {"event":"ui:error","screen":"wallet","severity":"error","code":"SUBMISSION_ERROR","message":"..."}
   {"event":"funding:transak","screen":"onramp","outcome":"success","timestamp":"2026-02-04T..."}
   ```

## Implementation Checklist

Suggested areas to add logging (if not already done):

- [ ] Service state changes (ServicesProvider)
- [ ] Wallet operations (fund, stake, unstake)
- [ ] Agent creation/deletion flows
- [ ] Settings changes
- [ ] Error boundary catches
- [ ] Network errors and API failures
- [ ] User dismissals/cancellations
- [ ] Feature-specific flows (staking, recovery, etc.)

For each area, use the appropriate logging function from `useFELogger` or direct imports.

## Troubleshooting

**Logs not appearing?**
- Ensure `nextLogEvent` is available (check ElectronApiProvider wiring)
- Check that IPC handler `next-log-event` is registered in `electron/main.js`
- Verify `nextLogger` is configured in `electron/logger.js`

**Logs missing PII?**
- Review the message being logged
- Strip personal identifiers before logging
- Use error codes instead of full error messages

**Too many logs?**
- Consider using lower severity for verbose events (info vs. warn/error)
- Filter logs in viewer if needed
- Adjust logging in high-frequency operations (e.g., polling)

## Future Enhancements

Possible additions:
- Browser session recording (with privacy controls)
- Performance metrics logging
- Network request/response logging (with PII filtering)
- User session timeline for debugging
- Real-time log streaming to support team
- Machine learning for anomaly detection
