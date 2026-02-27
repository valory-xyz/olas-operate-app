# Auto-Run Feature Reference

Single source of truth for the auto-run agent rotation feature.
Covers architecture, configuration, behavior, edge cases, and bugs fixed.

---

## 1. Architecture

### File Structure

```
frontend/context/AutoRunProvider/
  AutoRunProvider.tsx          — React context provider; wires hooks, exposes state/actions to UI
  constants.ts                 — Shared status enums and core auto-run timing constants
  types.ts                     — Shared TypeScript types (AgentMeta, AutoRunContextType, etc.)
  hooks/
    useAutoRunController.ts    — Composition root; wires signals + operations + scanner + lifecycle
    useAutoRunSignals.ts       — Shared refs, wait helpers, scan scheduling
    useAutoRunOperations.ts    — Start/stop/retry primitives, eligibility normalization
    useAutoRunScanner.ts       — Queue traversal, candidate selection, startSelectedAgentIfEligible
    useAutoRunLifecycle.ts     — Effects: rotation on rewards, rewards polling, startup/resume
    useAutoRunStore.ts         — Electron store persistence (enabled, includedAgents, userExcludedAgents)
    useConfiguredAgents.ts     — Derives AgentMeta[] from services
    useLogAutoRunEvent.ts      — Prefixed logging utility
    useSelectedEligibility.ts  — Eligibility for the currently selected agent
    useSafeEligibility.ts      — Safe creation checks
  utils/
    autoRunHelpers.ts          — refreshRewardsEligibility, formatEligibilityReason, isOnlyLoadingReason
    utils.ts                   — getAgentDisplayName, notifySkipped, notifyStartFailed, list utilities
```

### Data Flow

```
AutoRunProvider
  └─ useAutoRunController (composition root)
       ├─ useAutoRunSignals      → refs, wait loops, scheduleNextScan
       ├─ useAutoRunOperations   → startAgentWithRetries, stopAgentWithRecovery
       ├─ useAutoRunScanner      → scanAndStartNext, startSelectedAgentIfEligible
       └─ useAutoRunLifecycle    → rotation effect, rewards poll, startup/resume effect
```

### Key Refs

| Ref | Purpose |
|-----|---------|
| `enabledRef` | Live auto-run enabled state for async loops |
| `runningAgentTypeRef` | Currently running agent (from react-query polling) |
| `lastRewardsEligibilityRef` | Per-agent previous rewards state; guards duplicate rotation triggers |
| `isRotatingRef` | Prevents overlapping rotation/startup flows |
| `wasAutoRunEnabledRef` | Distinguishes first enable from agent-stopped-while-enabled |
| `stopRetryBackoffUntilRef` | Per-agent exponential backoff after stop timeout |
| `scanTimeoutRef` | Pending `scheduleNextScan` timer |
| `balanceLastUpdatedRef` | Tracks when balance data was last refreshed |
| `didLogStaleRef` | Deduplicates "balances stale" log messages |
| `skipNotifiedRef` | Per-agent+reason notification dedup; cleared on disable |

---

## 2. Configuration Constants

Note: constants come from both `constants.ts` and hook-local constants in
`useAutoRunSignals.ts`, `useAutoRunScanner.ts`, and `useAutoRunOperations.ts`.

| Constant | Value | Purpose |
|----------|-------|---------|
| `AUTO_RUN_START_DELAY_SECONDS` | 30s | Delay before starting after first enable (gives user time to configure) |
| `COOLDOWN_SECONDS` | 20s | Delay after stop before starting next agent |
| `RETRY_BACKOFF_SECONDS` | [15, 30, 60] | Progressive backoff between start retries |
| `REWARDS_POLL_SECONDS` | 60s | How often to poll rewards for the running agent |
| `SCAN_BLOCKED_DELAY_SECONDS` | 10min | Rescan delay when agents are blocked (low balance, evicted, etc.) |
| `SCAN_ELIGIBLE_DELAY_SECONDS` | 30min | Rescan delay when all agents have earned rewards |
| `SCAN_LOADING_RETRY_SECONDS` | 30s | Rescan delay on transient loading states |
| `START_TIMEOUT_SECONDS` | 300s (5min) | How long to wait for DEPLOYED status after start |
| `STOP_RECOVERY_MAX_ATTEMPTS` | 3 | Bounded stop retries per rotation |
| `STOP_RECOVERY_RETRY_SECONDS` | 15s | Delay between stop recovery attempts |
| `AGENT_SELECTION_WAIT_TIMEOUT_SECONDS` | 60s | Hard timeout for UI selection to match requested agent |
| `BALANCES_WAIT_TIMEOUT_SECONDS` | 180s (3min) | Hard timeout for balances to become ready |
| `REWARDS_WAIT_TIMEOUT_SECONDS` | 20s | Hard timeout for rewards snapshot to arrive |
| `ELIGIBILITY_WAIT_TIMEOUT_MS` | 60s | Hard timeout for eligibility to leave Loading state |
| `START_OPERATION_TIMEOUT_SECONDS` | 15min | Hard timeout wrapping `startService()` call itself |
| `SLEEP_DRIFT_THRESHOLD_MS` | 30s | Max allowed clock drift before treating as sleep/wake |
| `BALANCE_STALENESS_MS` | 60s | Balance data older than this triggers refetch |

---

## 3. Core Flows

### 3.1 First Enable

1. User toggles auto-run ON.
2. `useAutoRunLifecycle` startup effect fires. `wasEnabled = false` (first enable).
3. Wait `AUTO_RUN_START_DELAY_SECONDS` (30s) to let user adjust agent list.
4. Try `startSelectedAgentIfEligible` — checks rewards, eligibility, balances for the currently selected agent.
5. If selected can run → start it. If not → `scanAndStartNext` iterates the included queue.

### 3.2 Rotation on Rewards

1. `REWARDS_POLL_SECONDS` interval calls `refreshRewardsEligibility(runningAgent)`.
2. Snapshot update bumps `rewardsTick` → rotation effect fires.
3. Effect detects `false → true` transition via `lastRewardsEligibilityRef` guard.
4. `rotateToNext(currentAgent)`:
   a. Refresh rewards for all other agents.
   b. If all earned/unknown → keep current, rescan in 30min.
   c. Otherwise → `stopAgentWithRecovery` → cooldown → `scanAndStartNext`.

### 3.3 Resume After Stop (Sleep/Wake, Backend Crash)

1. Agent stops while auto-run is enabled → `runningAgentType` becomes null.
2. Startup effect fires with `wasEnabled = true`.
3. Cooldown (`COOLDOWN_SECONDS` = 20s).
4. Try `startSelectedAgentIfEligible` — this prioritizes the currently selected agent (usually the previously-running one because selection is persisted).
5. If it can still run → restart it. If not → `scanAndStartNext`.

### 3.4 Disable

1. `setEnabled(false)` → `enabledRef.current = false` + `stopRunningAgent()`.
2. All wait loops check `enabledRef.current` and exit early.
3. `stopAgentWithRecovery` runs to completion (does NOT check `enabledRef` — intentional, stop must finish).
4. Scan timers cleared.

---

## 4. Wait Loop Guardrails

All waits are guarded by `enabledRef.current`, `sleepAwareDelay()`, and hard timeouts:

| Wait Function | Hard Timeout | Sleep Detection | Exits on Disable |
|---------------|:---:|:---:|:---:|
| `waitForAgentSelection` | 60s (`AGENT_SELECTION_WAIT_TIMEOUT_SECONDS`) | Yes | Yes |
| `waitForBalancesReady` | 180s (`BALANCES_WAIT_TIMEOUT_SECONDS`) | Yes | Yes |
| `waitForRunningAgent` | 300s (`START_TIMEOUT_SECONDS`) | Yes | Yes |
| `waitForStoppedDeployment` | 300s (`START_TIMEOUT_SECONDS`) | Yes | No (stop must finish) |
| `waitForRewardsEligibility` | 20s (`REWARDS_WAIT_TIMEOUT_SECONDS`) | Yes | Yes |
| `waitForEligibilityReady` | 60s (`ELIGIBILITY_WAIT_TIMEOUT_MS`) | Yes | Yes |

**No wait can block indefinitely.** Every wait has a hard timeout that returns `false` (or `undefined` for rewards), allowing the caller to reschedule or bail.

---

## 5. Start Attempt Result Handling

`startAgentWithRetries` returns a structured `AutoRunStartResult`:

| Status | Meaning | Scanner Response |
|--------|---------|-----------------|
| `started` | Agent deployed and running | Done |
| `agent_blocked` | Deterministic blocker (low balance, evicted, etc.) | Skip with notification, advance queue |
| `infra_failed` | Transient failure (RPC/network/timeout) | Schedule short rescan, do NOT advance queue |
| `aborted` | Auto-run disabled or sleep detected | Stop processing |

The `infra_failed` handling prevents the scanner from rotating to a different agent when the backend is temporarily down.

---

## 6. Stop Recovery

`stopAgentWithRecovery` uses bounded retries:

1. Call `ServicesService.stopDeployment()` (with 60s HTTP timeout via `withTimeout`).
2. Poll `ServicesService.getDeployment()` (with 15s per-request timeout) until status is not `DEPLOYED/DEPLOYING/STOPPING`, up to `START_TIMEOUT_SECONDS`.
3. Fallback: check `runningAgentTypeRef.current !== agentType`.
4. If failed → wait `STOP_RECOVERY_RETRY_SECONDS`, retry.
5. Max `STOP_RECOVERY_MAX_ATTEMPTS` attempts.

On final failure in `rotateToNext`:
- Reset `lastRewardsEligibilityRef[agent]` to `undefined` (prevents permanent rotation blockage).
- Set `stopRetryBackoffUntilRef[agent]` to suppress immediate re-trigger from rewards poll.
- Schedule rescan in `SCAN_BLOCKED_DELAY_SECONDS` (10min).

---

## 7. Sleep/Wake Detection

### Mechanism
`sleepAwareDelay(seconds)` in `frontend/utils/delay.ts`:
- Records `Date.now()` before setTimeout.
- After setTimeout resolves, checks if `elapsed > expected + 30s`.
- Returns `false` on drift (sleep detected), `true` on normal completion.

### Coverage
Every delay and poll interval in auto-run uses `sleepAwareDelay`. On `false`:
- Wait functions return `false` / `undefined`.
- Callers bail out of the current flow.
- Safety net in startup effect's `.finally()` detects "flow interrupted before scan" and schedules a rescan.

### Stale Balance Detection
`balanceLastUpdatedRef` tracks when balance data was last refreshed. If older than 60s, `waitForBalancesReady` triggers a refetch and waits for fresh data before proceeding.

---

## 8. Eligibility Normalization

`normalizeEligibility` handles two special cases:

1. **"Another agent running"** → Treated as transient Loading (not a skip). This avoids false skip notifications during rotation transitions.
2. **"Loading: Balances" with live balances ready** → Overridden to `{ canRun: true }`. Catches stale render where deployability says Loading but balances context is already resolved.

---

## 9. Notification Deduplication

- **Skip notifications** (`notifySkipOnce`): Stored per `agentType + reason` in `skipNotifiedRef`. Same reason fires only once while auto-run stays enabled. Cleared on disable.
- **Loading reasons** are never notified (filtered by string check).
- **"balances stale" log**: `didLogStaleRef` logs once per staleness window; resets when balance data actually changes.

---

## 10. Scenarios and Expected Behavior

### Happy Path

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 1 | Enable with 1 eligible agent | Starts immediately | `startSelectedAgentIfEligible` → start |
| 2 | 3 eligible agents | Start selected → rotate on rewards → rotate → 30min cooldown → repeat | Follows included order, rotates on rewards |
| 3 | Enable while agent already running | No new start; wait for rewards | `if (runningAgentType) return` guard |
| 4 | Disable while running | Stop agent; switch shows loading | `setEnabled(false)` → `stopRunningAgent()` |

### Rotation

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 5 | Agent earns rewards | Stop → cooldown → start next | `false→true` transition triggers `rotateToNext` |
| 6 | Agent already earned before enable | Skip, move to next | Rewards snapshot check before start |
| 7 | All agents earned | Keep current running, rescan in 30min | `allEarnedOrUnknown` → `SCAN_ELIGIBLE_DELAY_SECONDS` |

### Blocked Agents

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 8 | Low balance | Skip with notification (once) | `notifySkipOnce` + `hasBlocked` |
| 9 | Evicted | Skip with notification | Via deployability |
| 10 | Region restricted | Skip with notification | Via deployability |
| 11 | No slots | Skip with notification | Via deployability |
| 12 | Under construction | Skip with notification | Via deployability |

### Loading States (No Skip Notification)

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 13 | Balances loading | Do not notify skip; wait/defer with timeout | `waitForBalancesReady` with hard timeout |
| 14 | Safe data loading | Do not notify skip; wait/defer with timeout | Treated as Loading |
| 15 | Staking/Geo loading | Do not notify skip; wait/defer with timeout | Treated as Loading |
| 16 | Services loading | Do not notify skip; wait/defer with timeout | Treated as Loading |

### Inclusion/Exclusion

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 17 | Decommissioned agent | Auto-excluded, cannot add | Filtered by `getEligibleAgentTypes` |
| 18 | User excludes agent | Moves to excluded list | `userExcludedAgents` in store |
| 19 | User re-includes agent | Reappears in included list | Appends with next order index |
| 20 | Order persists after restart | Same included order | Electron store persistence |
| 21 | Empty included list | Fallback to all eligible | `getOrderedIncludedAgentTypes` returns `eligibleAgentTypes` |

### Failure Handling

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 22 | Start fails (transient) | Retry with backoff; on final failure return `INFRA_FAILED`; do NOT advance queue | `startAgentWithRetries` → `INFRA_FAILED` → `SCAN_LOADING_RETRY_SECONDS` rescan |
| 23 | Stop fails | Bounded retries; reset rewards guard; schedule rescan | `stopAgentWithRecovery` + guard reset + `SCAN_BLOCKED_DELAY_SECONDS` |
| 24 | Disable during stop recovery | Stop recovery runs to completion | `waitForStoppedDeployment` does not check `enabledRef` |
| 25 | Rewards API fails (RPC error) | Log error, continue | Returns `undefined`; treated as "not yet earned" |
| 26 | Eligibility stuck loading | 60s timeout, then rescan in 30s or advance to next candidate | `waitForEligibilityReady` timeout → scanner continues |

### Infinite Loop Guards

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 27 | Single agent earns (no others) | Keep running, rescan 30min | `otherAgents.length === 0` → `SCAN_ELIGIBLE_DELAY_SECONDS` |
| 28 | STOPPING race | Treat as transient Loading | `ANOTHER_AGENT_RUNNING` normalized to Loading |
| 29 | Disabled during waits | Exit early | All waits check `enabledRef.current` |
| 30 | Disabled during retries | Stop retrying | `enabledRef.current` checked each iteration |

### Sleep/Wake Recovery

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 31 | Sleep during delay | Detect drift, abort, safety net reschedules | `sleepAwareDelay` returns `false` |
| 32 | Sleep during wait loop | Detect drift via polling delay | `sleepAwareDelay` in poll loops |
| 33 | Stale balances after wake | Refetch before proceeding | `balanceLastUpdatedRef` freshness check |
| 34 | Sleep during retry backoff | Abort retries | `sleepAwareDelay` returns `false` |
| 35 | Resume previously-running agent | Try same agent first, then scan | `startSelectedAgentIfEligible` before `scanAndStartNext` |
| 36 | Resume agent that earned during sleep | Falls through to scan | Rewards snapshot check returns `true` → `false` |

### Stop Timeout Recovery

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 37 | Stop timeout — auto-run recovers | Reset rewards guard + schedule rescan 10min | `lastRewardsEligibilityRef` reset + `scheduleNextScan` |
| 38 | Stop timeout — no immediate re-trigger | Backoff prevents rewards poll from re-triggering immediately | `stopRetryBackoffUntilRef` checked before rotation |

### Stale Balance Log Dedup

| # | Scenario | Expected | Implementation |
|---|----------|----------|----------------|
| 39 | Balances stale log spam | Log once per staleness window | `didLogStaleRef` resets on balance data change |

---

## 11. Go/No-Go Checklist

### A. Must-Pass (Release Blockers)

1. Enable auto-run with eligible agent → agent starts within timeout.
2. Toggle OFF → running agent stops.
3. Running agent earns rewards → stops → next eligible starts.
4. Loading states never show skip notification.
5. Never runs more than one agent concurrently.
6. Inclusion order and exclusions persist across restart.

### B. Stability (Release Blockers)

7. No infinite waits — all waits have hard timeouts.
8. Start failures retry same agent; do not advance queue on transient errors.
9. Stop failures use bounded recovery; manual disable does not exit stop early.
10. Sleep/wake: no chaotic cycling; stale delays abort; orchestration restarts with fresh state.

### C. UX (Strongly Recommended)

11. Toggle shows loading state during start/stop.
12. Skip notifications only for real blockers (not Loading states).
13. Manual sidebar navigation works while auto-run runs.

**Go** if all A + B pass and no critical UX issues. **No-Go** if any A or B fails.

---

## 12. Known Gaps

- Backend start can hang beyond `waitForRunningAgent` timeout if `startService()` itself hangs (mitigated by `withTimeout` wrapping the call at 15min).
- Rewards eligibility is selection-driven; polling via `setInterval` is a workaround.
- `rotateToNext`: if `currentMeta` is not found (agent removed from config mid-rotation), returns without scheduling rescan. Low probability; rewards poll will re-trigger within 60s.

---

## 13. Fixed Bugs

### P0 — Stop timeout causes permanent auto-run deadlock
- **Root cause**: Stop timeout in `rotateToNext` returned without scheduling rescan. `lastRewardsEligibilityRef[agent]` stayed `true`, blocking all future rotation triggers permanently. Root cause of all "stuck agent" reports.
- **Fix**: Reset rewards guard + schedule `SCAN_BLOCKED_DELAY_SECONDS` rescan + `stopRetryBackoffUntilRef` prevents immediate re-trigger loop.

### P0 — Transient start failures rotated queue to wrong agent
- **Root cause**: Scanner treated all failures (including `Failed to fetch`) as blocked and advanced queue.
- **Fix**: Structured `AutoRunStartResult` with `infra_failed` status; scanner pauses on infra failure without advancing.

### P0 — Stop recovery lacked bounded retries
- **Root cause**: Single stop attempt relied on derived running-agent signal; backend hiccups caused instability.
- **Fix**: `stopAgentWithRecovery` with bounded attempts + deployment-status polling + per-request timeouts.

### P1 — Sleep/wake causes chaotic agent cycling
- **Root cause**: `Date.now()` jumps after sleep; all delays expire instantly; stale balance data causes wrong decisions.
- **Fix**: `sleepAwareDelay()` detects drift; `balanceLastUpdatedRef` tracks freshness; safety net in `.finally()` reschedules on interrupted flow.

### P2 — Sleep/wake starts wrong agent instead of resuming
- **Root cause**: `wasEnabled=true` path went straight to `scanAndStartNext` without trying the currently selected agent first.
- **Fix**: `startSelectedAgentIfEligible` is called first; this usually resumes the previously-running agent when selection has remained/persisted.

### P1 — `waitForRewardsEligibility` missing `enabledRef` guard
- **Fix**: Added `enabledRef.current` to while condition; exits immediately on disable.

### P1 — `skipNotifiedRef` never cleared
- **Fix**: Reset on disable so notifications fire correctly on re-enable.

### P2 — `rotateToNext` stops agent when disabled mid-rotation
- **Fix**: Added `enabledRef.current` check before `stopAgent()`.

### P2 — `waitForRunningAgent` lacked `enabledRef` guard
- **Fix**: Added `enabledRef.current` to loop condition.

### P3 — Rotation effect race on `isRotatingRef`
- **Fix**: Set `isRotatingRef.current = true` before first await.

### Code — Balances stale log spam
- **Fix**: `didLogStaleRef` deduplicates; resets on balance data change.

### Code — Magic numbers replaced with named constants
- `SCAN_LOADING_RETRY_SECONDS = 30` replaces hardcoded `scheduleNextScan(30)`.

### Code — Dead code removed
- `if (!stopRunningAgent) return` was unreachable.

---

## 14. Utilities

### `sleepAwareDelay(seconds)` — `frontend/utils/delay.ts`
Returns `Promise<boolean>`. `true` = normal completion. `false` = sleep/wake detected (elapsed > expected + 30s). All async delays in auto-run use this.

### `withTimeout(operation, timeoutMs, createTimeoutError)` — `frontend/utils/delay.ts`
Races an operation against a timeout. Used to wrap `startService()` (15min) and `stopDeployment()` (60s) calls so they cannot hang indefinitely. Does not cancel the underlying operation.

### `refreshRewardsEligibility(params)` — `utils/autoRunHelpers.ts`
Fetches staking rewards info from the chain. Throttled per agent (max once per `REWARDS_POLL_SECONDS`). Returns `true` (earned), `false` (not earned), or `undefined` (error/missing data).

### `normalizeEligibility(eligibility)` — `useAutoRunOperations.ts`
Converts transient states ("Another agent running", stale "Loading: Balances") into consistent signals for the scanner to act on.

---

## 15. Log Messages Reference

All auto-run logs are prefixed with `autorun::`.

| Log | Meaning | Severity |
|-----|---------|----------|
| `rotation triggered: X earned rewards` | Rewards transition detected, rotation starting | Normal |
| `stop timeout for X, aborting rotation` | All stop attempts exhausted | Warning |
| `reset rewards guard for X, scheduling rescan in Ns` | Recovery from stop timeout | Warning |
| `all other agents earned or unknown, keeping X running, rescan in Ns` | No viable rotation target | Normal |
| `scan complete: no agent started (loading=, blocked=, eligible=), rescan in Ns` | Full scan found nothing to start | Normal |
| `safety net: flow interrupted before scan, retrying in Ns` | Sleep/wake bail-out recovery | Warning |
| `start timeout for X (attempt N)` | Start attempt timed out waiting for DEPLOYED | Warning |
| `start error for X: ...` | Start threw an exception (e.g., Failed to fetch) | Warning |
| `start failed for X` | All retries exhausted | Error |
| `skip X: reason` | Agent skipped with notification | Normal |
| `balances stale, triggering refetch` | Balance data older than 60s | Normal |
| `balances refetch failed: ...` | Refetch threw an error | Warning |
| `rewards fetch error: X: ...` | RPC error fetching rewards | Warning |
| `rewards eligibility timeout: X, proceeding without it` | Rewards snapshot never arrived in 20s | Warning |
| `eligibility wait timeout` | Eligibility stuck in Loading for 60s | Warning |
| `selection wait timeout: X` | UI selection didn't match in 60s | Warning |
| `balances wait timeout` | Balances not ready after 3min | Warning |
| `stop status check failed for X: ...` | Deployment status poll error | Warning |
| `stop retry for X (N/M) in Ns` | Stop recovery retry | Warning |
| `rotation error: ...` | Uncaught error in rotation effect | Error |

---

## 16. Notes for Future Unit Tests

- Mock `getSelectedEligibility` states (Loading / Low balance / Evicted / Eligible).
- Mock rewards snapshots (`undefined` / `false` / `true`).
- Verify rotation triggers only on `false → true` transition.
- Verify no notifications for Loading reasons.
- Verify no infinite loops (all waits have hard timeouts).
- Verify sleep/wake detection aborts in-flight waits and delays.
- Verify stop timeout resets rewards guard and schedules rescan.
- Verify `infra_failed` does not advance scanner queue.
- Verify concurrent stop calls (disable + rotation) don't crash.
