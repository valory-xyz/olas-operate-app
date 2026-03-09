# Bridging

## Overview

The bridging system handles cross-chain token transfers — getting funds from a source chain (typically Ethereum) to the agent's operating chain (e.g., Base, Gnosis, Optimism). It covers quoting, execution, status polling, and retry logic.

The system has three layers:

1. **Bridge API client** — HTTP requests to the middleware for quote fetching, execution, and status polling
2. **Core hooks** — `useBridgeRefillRequirements` (polling quote), `useBridgeRefillRequirementsOnDemand` (one-shot quote), `useBridgingSteps` (execute + poll status)
3. **Component-level orchestration** — `DepositForBridging` (quote + deposit tracking + auto-advance), `useMasterSafeCreateAndTransferSteps` (post-bridge safe creation), `useRetryBridge` (bridge failure recovery)

```
BridgeService (middleware API)
  ├── useBridgeRefillRequirements (polling quote fetcher)
  ├── useBridgeRefillRequirementsOnDemand (one-shot quote fetcher)
  └── useBridgingSteps (execute + status poll)
        │
        ├── DepositForBridging (quote + deposit tracking + auto-advance)
        ├── useMasterSafeCreateAndTransferSteps (post-bridge safe creation)
        └── useRetryBridge (bridge failure recovery)
```

## Source of truth

- `frontend/service/Bridge.ts` — bridge API client (quote, execute, status)
- `frontend/types/Bridge.ts` — `BridgeRequest`, `BridgeRefillRequirementsRequest`, `BridgeRefillRequirementsResponse`, `BridgeStatusResponse`, `QuoteStatus`, `BridgingStepStatus`, `BridgeStatuses`
- `frontend/hooks/useBridgeRefillRequirements.ts` — polling bridge quote fetcher
- `frontend/hooks/useBridgeRefillRequirementsOnDemand.ts` — one-shot bridge quote fetcher
- `frontend/hooks/useBridgingSteps.ts` — bridge execution + status polling
- `frontend/components/Bridge/Bridge.tsx` — Bridge UI state machine (`depositing → in_progress → completed`)
- `frontend/components/Bridge/BridgeOnEvm/DepositForBridging.tsx` — Bridge flow: quote polling, deposit tracking, auto-advance
- `frontend/components/Bridge/BridgeTransferFlow.tsx` — presentational: transfer details between chains
- `frontend/components/Bridge/BridgeInProgress/BridgeInProgress.tsx` — presentational: in-progress UI with bridging + safe creation steps
- `frontend/components/Bridge/BridgeInProgress/BridgingSteps.tsx` — presentational: step rendering (bridge, safe creation, safe transfer)
- `frontend/components/Bridge/BridgeInProgress/useRetryBridge.ts` — bridge retry (re-check refill requirements)
- `frontend/components/Bridge/BridgeInProgress/useMasterSafeCreateAndTransferSteps.ts` — post-bridge safe creation + transfer steps
- `frontend/components/Bridge/types.ts` — `BridgeMode`, `BridgeRetryOutcome`, `GetBridgeRequirementsParams`

## Contract / schema

### Bridge API (`BridgeService`)

| Method | HTTP | Endpoint | Body | Returns |
|---|---|---|---|---|
| `getBridgeRefillRequirements` | POST | `/api/bridge/bridge_refill_requirements` | `BridgeRefillRequirementsRequest` | `BridgeRefillRequirementsResponse` |
| `executeBridge` | POST | `/api/bridge/execute` | `{ id: string }` | `BridgeStatusResponse` |
| `getBridgeStatus` | GET | `/api/bridge/status/{id}` | — | `BridgeStatusResponse` |

All three methods accept `AbortSignal` for cleanup. All throw `Error` objects on non-ok responses with endpoint-specific messages (e.g., `"Failed to execute bridge quote for the following quote id: {id}"`).

### Quote request (`POST /api/bridge/bridge_refill_requirements`)

Request body:

```json
{
  "bridge_requests": [
    {
      "from": {
        "chain": "ethereum",
        "address": "0x74074a70dcE60E6996EC4b555342679645788ce5",
        "token": "0x0000000000000000000000000000000000000000"
      },
      "to": {
        "chain": "base",
        "address": "0xb0e25A231AD79076aA844F7c1987e1518F1628Bb",
        "token": "0x0000000000000000000000000000000000000000",
        "amount": "5628894686394391"
      }
    }
  ],
  "force_update": false
}
```

Response:

```json
{
  "id": "rb-36c6cbe0-1841-4de3-b9f6-873305a833f5",
  "bridge_request_status": [
    { "eta": 5, "message": null, "status": "QUOTE_DONE" }
  ],
  "balances": {
    "ethereum": {
      "0x74074a70dcE60E6996EC4b555342679645788ce5": {
        "0x0000000000000000000000000000000000000000": "0"
      }
    }
  },
  "bridge_refill_requirements": {
    "ethereum": {
      "0x74074a70dcE60E6996EC4b555342679645788ce5": {
        "0x0000000000000000000000000000000000000000": "5628894686394391"
      }
    }
  },
  "bridge_total_requirements": {
    "ethereum": {
      "0x74074a70dcE60E6996EC4b555342679645788ce5": {
        "0x0000000000000000000000000000000000000000": "5628894686394391"
      }
    }
  },
  "expiration_timestamp": 1773075127,
  "is_refill_required": true
}
```

The `id` is the quote bundle ID used for execution and status polling. `bridge_request_status` contains one entry per bridge request, with status values: `CREATED`, `QUOTE_DONE`, `QUOTE_FAILED`, `EXECUTION_PENDING`, `EXECUTION_DONE`, `EXECUTION_FAILED`.

### Execute bridge (`POST /api/bridge/execute`)

Request body:

```json
{ "id": "rb-36c6cbe0-1841-4de3-b9f6-873305a833f5" }
```

Response:

```json
{
  "id": "rb-36c6cbe0-1841-4de3-b9f6-873305a833f5",
  "status": "EXECUTION_PENDING",
  "bridge_request_status": [
    {
      "eta": 300,
      "explorer_link": "https://basescan.org/tx/0x8a3b1f9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
      "message": null,
      "status": "EXECUTION_PENDING",
      "tx_hash": "0x8a3b1f9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a"
    }
  ]
}
```

### Bridge status (`GET /api/bridge/status/{id}`)

Response has the same shape as execute. `bridge_request_status` entries gain `explorer_link` and `tx_hash` as execution progresses:

```json
{
  "id": "rb-36c6cbe0-1841-4de3-b9f6-873305a833f5",
  "status": "EXECUTION_DONE",
  "bridge_request_status": [
    {
      "eta": 0,
      "explorer_link": "https://basescan.org/tx/0x8a3b1f9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
      "message": "Bridge completed successfully",
      "status": "EXECUTION_DONE",
      "tx_hash": "0x8a3b1f9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a"
    }
  ]
}
```

### Frontend status mapping

Backend `QuoteStatus` values are mapped to frontend `BridgingStepStatus` for UI display:

| QuoteStatus | BridgingStepStatus | UI meaning |
|---|---|---|
| `EXECUTION_DONE` | `finish` | Checked icon |
| `EXECUTION_FAILED` | `error` | Red cross |
| `EXECUTION_PENDING` | `process` | Loading spinner |
| All others (including `QUOTE_DONE`, `CREATED`) | `process` | Loading spinner |

### BridgeMode

- `'onboard'` — first-time setup; uses `bridge_refill_requirements` from the quote response; may create master safe after bridging
- `'deposit'` — adding funds to existing agent; uses `bridge_total_requirements` from the quote response

## Runtime behavior

### Quote fetching — polling mode (`useBridgeRefillRequirements`)

Configurable polling wrapper around `getBridgeRefillRequirements`:

| Option | Default | Description |
|---|---|---|
| `params` | required | `BridgeRefillRequirementsRequest` (null disables) |
| `canPoll` | `true` | Controls polling toggle |
| `enabled` | `true` | Master enable flag |
| `queryKeySuffix` | optional | Appended to query key for deduplication |
| `pollingInterval` | 10s | Polling interval |

Polling runs when `isOnline && params && enabled`. The refetch interval is `pollingInterval` when both `enabled` and `canPoll` are true; otherwise polling stops. `staleTime: 0` ensures fresh data on every poll. `refetchOnMount: 'always'` and `refetchOnReconnect: 'always'` ensure immediate fetch on mount and reconnection.

### Quote fetching — on-demand mode (`useBridgeRefillRequirementsOnDemand`)

Same API call but `enabled: false` and `retry: false`. The query never runs automatically — consumers call `refetch()` manually. Used by the on-ramping flow (see on-ramping doc).

### Bridge execution and status polling (`useBridgingSteps`)

Two sequential React Query operations:

**Step 1 — Execute** (`BRIDGE_EXECUTE_KEY`):
- Fires once when `quoteId` is provided and `isOnline`
- Adds a 1-second delay before calling `executeBridge`
- `retry: false`, no polling, no refetch on window focus
- Returns the execution response with initial `bridge_request_status`

**Step 2 — Poll status** (`BRIDGE_STATUS_BY_QUOTE_ID_KEY`):
- Enabled only after execute completes (not loading, not fetching, has data)
- Polls `getBridgeStatus` every 5 seconds
- Stops polling when bridging is completed or failed
- No refetch on window focus

**Completion detection**: `isBridgingCompleted` is true when ALL `bridge_request_status` entries have `EXECUTION_DONE`. Checks execute response first (short-circuits if all done immediately), then falls back to status response.

**Failure detection**: `isBridgingFailed` is true when:
- Execute query itself errors, OR
- Status query errors, OR
- ANY `bridge_request_status` entry has `EXECUTION_FAILED` (checked in both execute and status responses)

**Bridge status output**: `bridgeStatus` is an array of `{ symbol, status, txnLink }` entries. When execute response shows all complete, uses execute data; otherwise uses status poll data. The `symbol` is paired by array index with the `tokenSymbols` parameter.

### Bridge UI state machine (`Bridge.tsx`)

The `Bridge` component manages the full bridging flow through three states:

```
depositing → in_progress → completed
    ↑                          │
    └──── NEED_REFILL ─────────┘
```

- **depositing**: renders `BridgeOnEvm` (which contains `DepositForBridging`). Polls for quotes, shows deposit requirements.
- **in_progress** / **completed**: renders `BridgeInProgress`. Shows execution steps, safe creation (onboard mode). Requires `quoteId` and `transferAndReceivingDetails` — throws if missing.
- **NEED_REFILL**: when `useRetryBridge` reports that refill is still required after a bridge failure, the state resets to `depositing` (clears `quoteId` and transfer details).

On completion, calls `onBridgingCompleted` callback. The `fromChain` defaults to `ethereum` when not specified.

### Bridge flow quote lifecycle (`DepositForBridging`)

The Bridge-side quote orchestration. Uses `useBridgeRefillRequirements` directly:

1. Polls `getBridgeRefillRequirements` at 10-second intervals (default)
2. Manually refetches on mount to avoid stale values from a previous visit
3. Derives per-token deposit details: `totalRequiredInWei`, `pendingAmountInWei`, `currentBalanceInWei` (= total - pending), `areFundsReceived`
4. Computes `quoteEta` as the **maximum ETA** among all `QUOTE_DONE` entries
5. Stops polling when any `bridge_request_status` entry has `QUOTE_FAILED`

**Auto-advance**: the flow automatically proceeds to `in_progress` when:
- All tokens have `areFundsReceived === true`, AND
- `is_refill_required` is `false`, AND
- `quoteEta` is available, AND
- Not currently fetching or in a loading state

On auto-advance: sets the `quoteId`, builds `CrossChainTransferDetails` (from/to chains, token transfers, ETA), shows a "Funds received" toast, and calls `onNext()` after a 2-second delay.

**Retry flow**:
1. Sets `force_update: true` on next request
2. Pauses polling
3. Adds 1-second delay
4. Refetches manually
5. On success: resets `force_update` to false, resumes polling

### Post-bridge safe creation (`useMasterSafeCreateAndTransferSteps`)

Runs after bridging completes during onboarding:

1. On mount, checks if master safe exists via `getMasterSafeOf(chainId)`
2. Sets `canCreateMasterSafeAndTransferRef` = `mode === 'onboard' && !hasMasterSafe` (only once, via ref)
3. After bridging completes: if `shouldCreateMasterSafe && !isRefillRequired && isBridgingCompleted`, calls `createMasterSafe()`
4. Returns step status details for both creation and transfer sub-steps

Guards preventing safe creation:
- `isRefillRequired` is true
- Bridging still in progress or failed
- Master wallet data not yet fetched
- Safe creation already in progress or errored
- Safe already exists

### Bridge retry (`useRetryBridge`)

Simple hook for recovering from bridge failures:

1. Calls `refetchForSelectedAgent()` to re-check refill requirements
2. If `is_refill_required` → calls `onRetryOutcome('NEED_REFILL')` (navigates back to refill page)
3. If not required → shows a toast message suggesting app restart

## Failure / guard behavior

- **BridgeService methods** — all three throw `Error` objects on non-ok responses with endpoint-specific messages (e.g., `"Failed to get bridge refill requirements for the following params: ..."`, `"Failed to execute bridge quote for the following quote id: ..."`, `"Failed to get bridge status for the following quote id: ..."`). No HTTP status-specific handling.
- **useBridgeRefillRequirements** — disabled when `!isOnline`, `!params`, or `!enabled`. Returns `null` (not undefined) when params are missing inside the query function.
- **useBridgeRefillRequirementsOnDemand** — `enabled: false` means it never auto-fires. `retry: false` means failures are not retried. Returns `null` when params are missing.
- **useBridgingSteps** — execute query has `retry: false`. If `quoteId` is falsy but enabled, logs a warning and returns undefined (does not throw). Catches and re-throws errors after logging.
- **useBridgingSteps status poll** — enabled only when execute is fully complete (not loading AND not fetching AND has data). This prevents the status query from firing during execute retries.
- **isBridgingCompleted uses `.every()`** — all entries must be `EXECUTION_DONE`. An empty array returns `true` (vacuous truth), but this is safe because the hook only runs when there are bridge requests.
- **isBridgingFailedFn uses `.some()`** — any single `EXECUTION_FAILED` triggers failure, even if other requests succeeded.
- **getBridgeStats index pairing** — `tokenSymbols[index]` pairs symbols with `bridge_request_status` entries by array position. If the arrays are misaligned, symbols will be wrong.
- **DepositForBridging quote-failed guard** — stops polling when any `bridge_request_status` entry has `QUOTE_FAILED`. Also checks `isBridgeRefillRequirementsError` from the query itself.
- **DepositForBridging auto-advance guards** — requires all of: not loading, not fetching, has data, tokens length > 0, quote not failed, masterEoa exists, wallet fetched, quoteEta exists, bridge_requests exists. Missing any prevents auto-advance.
- **DepositForBridging tokens stale values** — the `tokens` memo does NOT guard against stale quotes (no check on `isRequestingQuote`). This can show stale values from expired quotes.
- **Bridge.tsx state invariants** — throws `Error` if `in_progress` state is reached without `quoteId` or `transferAndReceivingDetails`.
- **useMasterSafeCreateAndTransferSteps ref guard** — `canCreateMasterSafeAndTransferRef` is set only once (when `null`), so remounts or re-renders don't re-evaluate safe creation need.
- **useRetryBridge** — returns early without action when `refetch()` returns no data.
- **Offline** — `useBridgeRefillRequirements`, `useBridgingSteps` execute query, and `useBridgingSteps` status poll are all online-gated. `useBridgeRefillRequirementsOnDemand` is NOT explicitly online-gated (it relies on manual `refetch()` calls).

## Test-relevant notes

- `BridgeService` has three methods — all are fetch wrappers. Mock `fetch` and verify URL construction, method, body, and `AbortSignal` passthrough.
- `useBridgingSteps` has a two-phase query pattern (execute → poll) — test that the status poll only starts after execute completes. Test the 5-second polling interval and the stop conditions (completed, failed).
- `isBridgingCompletedFn` uses `.every()` — test with mixed statuses (some done, some pending) to verify it returns false.
- `isBridgingFailedFn` uses `.some()` — test that a single `EXECUTION_FAILED` among `EXECUTION_DONE` entries triggers failure.
- `getBridgeStats` pairs `tokenSymbols` with `bridge_request_status` by array index — test with mismatched array lengths.
- `useBridgeRefillRequirements` has five configurable options — test each combination of `canPoll`, `enabled`, and `isOnline` for correct polling behavior.
- `useBridgeRefillRequirementsOnDemand` is `enabled: false` with `retry: false` — test that it only fires on manual `refetch()` and does not retry failures.
- `useMasterSafeCreateAndTransferSteps` uses a ref to lock the safe creation decision — test that it doesn't re-evaluate after initial mount.
- `useRetryBridge` has two outcomes: `NEED_REFILL` callback or toast message — test both paths and the early return on missing data.
- `Bridge.tsx` state machine has three states (`depositing → in_progress → completed`) — test transitions, `NEED_REFILL` reset, and the throw on missing `quoteId`/`transferDetails` in `in_progress`.
- `DepositForBridging` computes `quoteEta` as `Math.max(...)` of all `QUOTE_DONE` ETAs — test with multiple bridge requests having different ETAs.
- `DepositForBridging` auto-advance has 9+ guards — test that missing any single guard prevents auto-advance.
- `DepositForBridging` stops polling on `QUOTE_FAILED` — test that `canPollForBridgeRefillRequirements` is set to false when a failed quote is detected.
- `BridgingSteps` is purely presentational — test `generateBridgeStep`, `generateMasterSafeCreationStep`, `generateMasterSafeTransferStep` step generation with each status.
- `BridgeTransferFlow` is purely presentational — test that it renders from/to chains and transfer rows.
- `BridgeInProgress` coordinates bridge + safe creation steps — test the `onNext()` call conditions: only fires when bridging is complete AND (no safe creation needed OR safe creation + transfer complete).
