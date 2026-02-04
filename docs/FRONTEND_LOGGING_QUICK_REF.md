# Quick Reference: Frontend Logging

## Import the Hook

```typescript
import { useFELogger } from '@/hooks/useFELogger';
```

## Common Usage Patterns

### Log a Screen Navigation
```typescript
const { logNavigation } = useFELogger();
logNavigation('wallet-screen');
```

### Log an Error
```typescript
const { logUIError } = useFELogger();
logUIError('wallet-screen', 'INSUFFICIENT_BALANCE', 'Not enough funds');
```

### Log a Warning
```typescript
const { logUIWarning } = useFELogger();
logUIWarning('wallet-screen', 'Low balance warning');
```

### Log a Funding Flow
```typescript
const { logFundingEvent } = useFELogger();

// When starting
logFundingEvent('started', undefined, 'Initiating on-ramp');

// On success
logFundingEvent('success');

// On failure
logFundingEvent('failure', 'TRANSAK_FAILED', 'Transak returned error');

// If cancelled
logFundingEvent('cancelled');
```

### Log a Web3Auth Flow
```typescript
const { logWeb3AuthEvent } = useFELogger();

logWeb3AuthEvent('started');
logWeb3AuthEvent('success');
logWeb3AuthEvent('failure', 'AUTH_FAILED', 'Web3Auth error');
```

### Log with Notification
```typescript
import { useMessageApi } from '@/context/MessageProvider';
import { showErrorWithLogging } from '@/utils/notificationLogger';
import { useFELogger } from '@/hooks/useFELogger';

const messageApi = useMessageApi();
const { logUIError } = useFELogger();

showErrorWithLogging(
  messageApi,
  'Operation failed',
  logUIError,
  'my-screen',
  'OPERATION_ERROR'
);
```

## Available Functions

From `useFELogger()`:

- `logEvent(event: FELogEvent)` - Generic
- `logNavigation(screen: string)` - Route changes
- `logUIError(screen, code, message?)` - Error messages
- `logUIWarning(screen, message?)` - Warnings
- `logUINotification(screen, message?)` - Info messages
- `logFundingEvent(outcome, code?, message?)` - On-ramp flows
- `logBridgeEvent(outcome, code?, message?)` - Bridge flows
- `logWeb3AuthEvent(outcome, code?, message?)` - Auth flows
- `logAppLifecycle(stage, message?)` - App lifecycle

## Outcome Values

Use for multi-step flows:
- `'started'` - Flow initiated
- `'success'` - Flow completed successfully
- `'failure'` - Flow failed
- `'cancelled'` - User cancelled
- `'pending'` - Awaiting result

## What NOT to Log

❌ User addresses  
❌ Private keys  
❌ Full error stack traces  
❌ User input data  
❌ Transaction IDs or hashes  
❌ Any personally identifiable information  

## Viewing Logs

1. Click "Export Logs" in the app
2. Open the exported zip file
3. Find `next.log` inside
4. Search for your events

Example log entries:
```json
{"event":"nav:screen","screen":"wallet","severity":"info"}
{"event":"funding:transak","outcome":"started","severity":"info"}
{"event":"ui:error","severity":"error","code":"INSUFFICIENT_BALANCE","screen":"wallet"}
```

## Automatic Logging

These happen without any code:
- Route navigation (in `_app.tsx`)
- App lifecycle events (boot, loaded, ready)
- Error boundary catches (via `nextLogError`)

## Complete Documentation

See [docs/frontend-logging.md](docs/frontend-logging.md) for full details.
