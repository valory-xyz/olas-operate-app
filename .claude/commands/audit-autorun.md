You are auditing the AutoRun feature in the Pearl frontend codebase (olas-operate-app).

**Argument**: `$ARGUMENTS`

- If `$ARGUMENTS` looks like a directory path (starts with `/`, `./`, or contains a path separator), run **Part A (Runtime Diagnosis)** on that directory, then **Part B (Code Audit)**.
- If `$ARGUMENTS` is blank or `code`, run **Part B (Code Audit)** only.
- If `$ARGUMENTS` starts with `logs`, run **Part A (Runtime Diagnosis)** only on the path that follows.

Full reference: `docs/features/autorun.md`
Source: `frontend/context/AutoRunProvider/`

---

## Architecture Reference

```
AutoRunProvider.tsx
  └─ useAutoRunController.ts          ← composition root
       ├─ useAutoRunSignals.ts         ← refs, wait helpers, scheduleNextScan
       ├─ useAutoRunOperations.ts      ← thin composition: start/stop/rewards
       │    ├─ useAutoRunStartOperations.ts  ← guarded start with retries
       │    └─ useAutoRunStopOperations.ts   ← stop + deployment confirmation + recovery
       ├─ useAutoRunScanner.ts         ← queue traversal, startSelectedAgentIfEligible
       └─ useAutoRunLifecycle.ts       ← rotation effect, rewards poll, startup/resume
```

### Key Refs

| Ref | Purpose |
|-----|---------|
| `enabledRef` | Live enabled state — all async loops check this |
| `runningAgentTypeRef` | Currently running agent |
| `isRotatingRef` | Prevents overlapping rotation/startup flows |
| `wasAutoRunEnabledRef` | Distinguishes first enable from resume |
| `lastRewardsEligibilityRef` | Guards duplicate rotation triggers (false→true only) |
| `stopRetryBackoffUntilRef` | Per-agent backoff after stop timeout |
| `scanTimeoutRef` | Pending `scheduleNextScan` timer |
| `balanceLastUpdatedRef` | Tracks when balance data was last refreshed |
| `skipNotifiedRef` | Per-agent+reason notification deduplication; **cleared on disable** |
| `didLogStaleRef` | Deduplicates "balances stale" log messages |

### Constants (`constants.ts`)

| Constant | Expected Value | Notes |
|---|---|---|
| `AUTO_RUN_START_DELAY_SECONDS` | 30s | Grace on first enable |
| `COOLDOWN_SECONDS` | 20s | Between stop and next start |
| `RUNNING_AGENT_MAX_RUNTIME_SECONDS` | 70min | Watchdog rotation threshold |
| `RUNNING_AGENT_WATCHDOG_CHECK_SECONDS` | 5min | Watchdog check cadence |
| `RETRY_BACKOFF_SECONDS` | `[30, 60, 120]` | Array — 3 attempts |
| `REWARDS_POLL_SECONDS` | 120s | Polling interval for running agent |
| `SCAN_BLOCKED_DELAY_SECONDS` | 600s | All agents deterministically blocked |
| `SCAN_ELIGIBLE_DELAY_SECONDS` | 1800s | Agent eligible but keeping current running |
| `SCAN_LOADING_RETRY_SECONDS` | 30s | Transient/loading state |
| `START_TIMEOUT_SECONDS` | 900s | Cold start budget |
| `STOP_REQUEST_TIMEOUT_SECONDS` | 300s | HTTP stop call timeout |
| `STOP_RECOVERY_MAX_ATTEMPTS` | 3 | Bounded stop retries |
| `STOP_RECOVERY_RETRY_SECONDS` | 60s | Delay between stop recovery attempts |
| `AGENT_SELECTION_WAIT_TIMEOUT_SECONDS` | 60s | Max wait for UI selection sync |
| `REWARDS_WAIT_TIMEOUT_SECONDS` | 20s | Max wait for rewards snapshot |
| `DISABLE_RACE_STOP_CHECK_INTERVAL_MS` | 10s | Poll cadence for disable-race guard |
| `DISABLE_RACE_STOP_MAX_CHECKS` | 90 | 90 × 10s = 15min max window |
| `SLEEP_DRIFT_THRESHOLD_MS` | 30s | Clock drift before treating as sleep |

### Wait Loop Guardrails

Every wait has a hard timeout. No wait can block indefinitely.

| Wait Function | Timeout | Sleep Detection | Exits on Disable |
|---|---|---|---|
| `waitForAgentSelection` | 60s | Yes | Yes |
| `waitForBalancesReady` | 180s | Yes | Yes |
| `waitForRunningAgent` | 900s | Yes | Yes |
| `waitForStoppedDeployment` | 900s | Yes | **No** — stop must finish |
| `waitForRewardsEligibility` | 20s | Yes | Yes |
| `waitForEligibilityReady` | 60s | Yes | Yes |

### Start Result Statuses

| Status | Meaning | Scanner must... |
|---|---|---|
| `started` | Agent deployed and running | Return `{ started: true }` |
| `agent_blocked` | Deterministic blocker (low balance, evicted, etc.) | Mark `hasBlocked`, advance to next candidate |
| `infra_failed` | Transient failure (network, timeout, backend 500) | Mark `hasInfraFailed`, advance — **do NOT return early** |
| `aborted` | Auto-run disabled or sleep detected | Return `{ started: false }` immediately |

---

## Part A — Runtime Diagnosis

### A0 — Delegate broad log reading to analyze-logs

**Do NOT read log files in full.** Invoke the `analyze-logs` skill with the provided path as argument. It will:
1. Read only the **last 100 lines** of `electron.log` and `cli*.log` to detect the newest timestamp
2. Compute the 48-hour cutoff window and read only the relevant portion
3. Reconstruct the timeline and surface backend errors

Take note of the **date window** and the **service UUID → agent type mapping** that `analyze-logs` produces. Use both for all grep searches below.

### A1 — Symptom → Investigation Path

Before searching logs, identify which symptom applies and follow the corresponding path:

| Symptom | First grep to run | Then check |
|---|---|---|
| Agent never starts, auto-run enabled | `scan complete: no agent started` | `blocked=` / `infraFailed=` / `eligible=` fields to categorize cause. If `infraFailed=true` → A3. If `blocked=true` → check `skip` entries. |
| Agent starts then immediately stops | `rotation triggered` near start time | If absent: check watchdog timing. If present: was rewards flip unexpected? Check `lastRewardsEligibilityRef`. |
| No rotation despite epoch/rewards earned | `rotation triggered` (absence) | Check `stop timeout` — was guard reset? Check `epoch expired` — was epoch fix applied? |
| Auto-run shows enabled but nothing runs, no logs | `safety net` / `isRotatingRef` leaked | Check `rotation error` — if present, `isRotatingRef` may be stuck. |
| Same agent restarts over and over | `safety net: flow interrupted` | Likely sleep/wake cycling. Check `sleepAwareDelay` bail-outs. |
| Agent stuck "starting" for >15min | `start timeout` / `start error` | Check cli.log at same timestamp. May be backend 500 or IPFS hang. |
| Button greyed out despite sufficient funds | (check cli.log directly) | `GET /funding_requirements 500` → staking params issue. |
| Epoch shows 0:00, no agent starts | `epoch expired` | If absent → epoch fix not running. If present → confirm start attempts follow. |
| Disable leaves agent running | `disable-race` / check `AutoRunProvider.tsx` useEffect | The disable-race guard watches `(enabled, runningAgentType, isStopping)`. |

### A2 — AutoRun Log Pattern Triage (electron.log)

Run **targeted grep searches** for each pattern. Do **not** re-read the file in full. Filter to the date window from A0.

**Healthy signals** — confirm at least one of each appears while auto-run was enabled:
- `autorun:: enabled`
- `autorun:: started`
- `rotation triggered`

**Warning/error patterns** — grep for each, note count and timestamp range:

| Grep pattern | Severity | Meaning |
|---|---|---|
| `stop timeout for` | Warning | All stop attempts exhausted for an agent |
| `reset rewards guard for` | Warning | Recovery from stop timeout — should always follow a `stop timeout` |
| `rotation error` | Error | Uncaught exception in rotation; check if `rotation triggered` ever fires again |
| `safety net: flow interrupted` | Warning | Sleep/wake bail-out caused orchestration to restart from safety net |
| `start timeout` | Warning | Start attempt waited full 15min without reaching DEPLOYED |
| `start error for` | Warning | Start threw an exception (e.g., Failed to fetch); note which agent and attempt number |
| `start failed for` | Error | All retries exhausted; agent could not be started |
| `scan complete: no agent started` | Normal/Warning | Full scan with nothing to start — inspect `loading=`, `blocked=`, `eligible=`, `infraFailed=` |
| `infra_failed` | Warning | Transient start failure — check whether "trying next candidate" (good) or "rescan in 30s" (old bug) follows |
| `selected start paused` | Warning | `startSelectedAgentIfEligible` hit `INFRA_FAILED` — should say "scanning other agents", not "rescan in 30s" |
| `epoch expired` | Normal | Epoch expiry override applied — confirm agent starts follow within next scan |
| `all other agents earned or unknown` | Normal | Keeping current agent running; expected when all others have earned |
| `balances stale, triggering refetch` | Normal | Balance data older than 120s; should resolve within seconds |
| `balances refetch failed` | Warning | Refetch threw; balance freshness unknown |
| `rewards fetch error` | Warning | RPC error fetching rewards for an agent |
| `rewards eligibility timeout` | Warning | Rewards snapshot never arrived in 20s; scanner proceeded without it |
| `eligibility wait timeout` | Warning | Eligibility stuck in Loading for 60s |
| `selection wait timeout` | Warning | UI selection didn't match requested agent in 60s |
| `balances wait timeout` | Warning | Balances not ready after 3min |
| `skip ` | Normal | Agent skipped — note reason; should not fire for "Loading" reasons |
| `rotation triggered` | Normal | `false→true` rewards transition detected — verify stop + new start follows |

**Absence checks:**
- No `rotation triggered` for 30+ min while agent running → rewards poll not firing, or `lastRewardsEligibilityRef` stuck at `true`
- No `reset rewards guard` after a `stop timeout` → rotation permanently blocked (B4 bug)
- `rotation error` followed by no further `rotation triggered` ever → `isRotatingRef` leaked (B3 bug)

### A3 — Backend Correlation (cli.log)

For any `Failed to fetch` or `infra_failed` in A2, grep cli.log for the **same timestamp ±5 seconds**. Do not read cli.log in full.

| cli.log signal | Frontend symptom | Root cause |
|---|---|---|
| `POST /api/v2/service/{id}" 500` + `insufficient balance for asset` | `TypeError: Failed to fetch` | Wallet below staking requirement — check `required` vs `available` |
| `POST /api/v2/service/{id}" 500` + `NoneType`/`AttributeError` on `min_staking_deposit` | `TypeError: Failed to fetch` | Staking contract unresolved — user moved `.operate` folder or changed staking program |
| `GET /api/v2/service/{id}/funding_requirements" 500` | Button greyed out with "Low balance" despite sufficient funds | Backend staking params broken — `canStartSelectedAgent = false` |
| `current_staking_program=None` | Rewards not swept to master wallet | Staking reference lost after service stop — rewards accumulate in Safe silently |

**CORS note**: backend 500 responses appear as `TypeError: Failed to fetch` in the frontend because CORS headers are absent on error responses. Always correlate with cli.log to find the real cause.

### A4 — Service UUID Mapping

Use `debug_data.json` (already read by `analyze-logs`) to map `sc-{uuid}` filenames to agent types. Note which agents were active during the incident window.

---

## Part B — Code Audit

Read the relevant files. For each section, output ✅ / ❌ / ⚠️ with evidence.

### B1 — Scanner: `INFRA_FAILED` Handling (`useAutoRunScanner.ts`)

In `scanAndStartNext`, after `const startResult = await startAgentWithRetries(candidate)`:

| Status | Required behavior | Bug if wrong |
|---|---|---|
| `STARTED` | `return { started: true }` | — |
| `ABORTED` | `scheduleNextScan(SCAN_LOADING_RETRY_SECONDS)` + `return { started: false }` | Missing schedule = silent idle |
| `INFRA_FAILED` | `hasInfraFailed = true` + `candidate = findNextInOrder(candidate)` + `continue` | Early `return` skips all remaining candidates → infinite retry loop on one agent |
| `AGENT_BLOCKED` | `hasBlocked = true` + advance + `continue` | — |

Check scan-completion delay logic:
```ts
if (hasLoading || hasInfraFailed) return SCAN_LOADING_RETRY_SECONDS;  // ← hasInfraFailed must be here
if (hasBlocked) return SCAN_BLOCKED_DELAY_SECONDS;
if (hasEligible) return SCAN_ELIGIBLE_DELAY_SECONDS;
```
❌ `hasInfraFailed` missing from first condition = 10min delay instead of 30s on transient failures.

Check `visited` set exists and is populated at the top of the `while` loop — prevents infinite circular scan.

### B2 — Scanner: `startSelectedAgentIfEligible` Fallthrough (`useAutoRunScanner.ts`)

After `startAgentWithRetries(selectedAgentType)` returns `INFRA_FAILED`:

✅ **Correct**:
```ts
if (startResult.status === AUTO_RUN_START_STATUS.INFRA_FAILED) {
  await scanAndStartNext(selectedAgentType);  // try other agents
  return true;                                 // prevent lifecycle double-call
}
```

❌ **Old bug**:
```ts
if (startResult.status === AUTO_RUN_START_STATUS.INFRA_FAILED) {
  scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);  // blind 30s rescan of SAME agent
  return true;
}
```
Bug effect: system retries the same failing agent every 30s indefinitely, never trying other agents.

Also check: `scanAndStartNext` is in the `useCallback` deps array of `startSelectedAgentIfEligible`.

### B3 — `isRotatingRef` Guard (`useAutoRunLifecycle.ts`)

For every location that sets `isRotatingRef.current = true`, verify a `finally { isRotatingRef.current = false }` block exists:

- **Rewards rotation** (`checkRewardsAndRotate` async function)
- **Watchdog** (inside `setInterval` callback, wrapped in `void (async () => { ... })()`)
- **Startup/resume** (`startNext` async, reset in `.finally()` of the promise chain)

❌ Any missing `finally` = rotation permanently locked after any error.

For the watchdog specifically, also check that the `catch` block resets `lastRewardsEligibilityRef.current[currentType] = undefined` and calls `scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS)` — a separate P0 fix (watchdog exception otherwise leaves the rewards guard stuck at `true` permanently).

### B4 — `lastRewardsEligibilityRef` Guard (`useAutoRunLifecycle.ts`)

This ref prevents the `false → true` transition from triggering rotation more than once.

**Check 1 — Backoff is checked BEFORE writing the guard** (critical ordering):
```ts
// Correct order in checkRewardsAndRotate:
const stopRetryBackoffUntil = stopRetryBackoffUntilRef.current[currentType] ?? 0;
if (Date.now() < stopRetryBackoffUntil) return;       // check backoff FIRST
const previousEligibility = lastRewardsEligibilityRef.current[currentType];
lastRewardsEligibilityRef.current[currentType] = snapshot;  // THEN write guard
```
❌ Guard written before backoff check = during the 10-min backoff window the guard gets overwritten to `true`, permanently blocking future rotation triggers when backoff expires.

**Check 2 — Reset to `undefined` (not `false`) in all recovery paths**:
- After stop timeout in `rotateToNext`: `lastRewardsEligibilityRef.current[agent] = undefined`
- After `rotateToNext` exception in rewards catch block: `lastRewardsEligibilityRef.current[currentType] = undefined`
- After watchdog exception in watchdog catch block: `lastRewardsEligibilityRef.current[currentType] = undefined`

❌ Reset to `false` = next rewards poll sees `false → true` and re-triggers rotation immediately, potentially during backoff.
❌ Missing reset in any catch block = rotation permanently blocked after that exception.

### B5 — Epoch Expiry Normalization (`utils/autoRunHelpers.ts`)

`refreshRewardsEligibility` must compute `epochExpired` and return `false` when epoch has expired, regardless of `isEligibleForRewards`:

```ts
// Inside refreshRewardsEligibility:
const epochExpired = nowInSeconds - tsCheckpoint >= livenessPeriod;
if (epochExpired) return false;  // stale earned state — agent must run to trigger checkpoint
```

`useAutoRunController` must separately compute `isEpochExpired` from `stakingRewardsDetails` and pass it to `useAutoRunSignals`, which applies `isEpochExpired ? false : isEligibleForRewards` at snapshot write time — preventing the RewardProvider's 5s poll from overwriting the corrected snapshot with stale `true`.

❌ If absent: agents that ran in the previous epoch will be permanently skipped as all have `isEligibleForRewards = true`, epoch clock shows 0, and no agent is running to trigger the on-chain `checkpoint()`.

Log signal when working: `epoch expired, stale isEligibleForRewards=true overridden to false`

### B6 — Sleep-Aware Delays and Wait Helper Guards (`useAutoRunSignals.ts`, `useAutoRunStartOperations.ts`, `useAutoRunStopOperations.ts`)

**All delays must use `sleepAwareDelay`** — check these specific locations:
- `COOLDOWN_SECONDS` wait in `rotateToNext`
- `AUTO_RUN_START_DELAY_SECONDS` wait in `startNext` (first enable)
- `RETRY_BACKOFF_SECONDS[attempt]` wait in `startAgentWithRetries`
- `STOP_RECOVERY_RETRY_SECONDS` wait in `stopAgentWithRecovery`
- Every poll loop (2s, 5s increments in eligibility/stop-confirmation polls)

❌ Any bare `setTimeout`/`new Promise` = won't bail on sleep, won't exit on disable.

**All wait helpers must have `enabledRef` guards** — past P1/P2 bugs were missing these:
- `waitForRewardsEligibility` — must check `enabledRef.current` in `while` condition
- `waitForRunningAgent` — must check `enabledRef.current` in `while` condition
- `waitForStoppedDeployment` — intentionally does NOT check `enabledRef` (stop must finish)

**Interrupted retry backoff must return `INFRA_FAILED`, not `ABORTED`, when still enabled**:
```ts
const retryOk = await sleepAwareDelay(RETRY_BACKOFF_SECONDS[attempt]);
if (!retryOk) {
  if (!enabledRef.current) return { status: AUTO_RUN_START_STATUS.ABORTED };
  // ↑ enabled check must happen here
  return { status: AUTO_RUN_START_STATUS.INFRA_FAILED, reason: 'retry interrupted' };
}
```
❌ Returning `ABORTED` when still enabled = orchestration restarts from scratch and logs `attempt 1` repeatedly in an infinite loop instead of following the controlled rescan path.

### B7 — `useCallback` Dependency Arrays

Key relationships to verify:

| Hook | Must include in deps |
|---|---|
| `startSelectedAgentIfEligible` | `scanAndStartNext` |
| `startAgentWithRetries` | `startService`, `waitForRunningAgent`, `createSafeIfNeeded`, `notifySkipOnce` |
| `stopAgentWithRecovery` | `stopAgentOnce`, `recordMetric`, `logVerbose` |
| `rotateToNext` | `stopAgentWithRecovery`, `refreshRewardsEligibility`, `scheduleNextScan` |
| `scanAndStartNext` | `startAgentWithRetries`, `scheduleNextScan`, `findNextInOrder`, `waitForEligibilityReady` |

Lifecycle effects use **refs** for `startSelectedAgentIfEligible` and `scanAndStartNext` to avoid stale closures inside long-running async loops — this is intentional and correct:
```ts
const startSelectedAgentIfEligibleRef = useRef(startSelectedAgentIfEligible);
useEffect(() => { startSelectedAgentIfEligibleRef.current = startSelectedAgentIfEligible; }, [...]);
```

### B8 — Constants Sanity (`constants.ts`)

- `RETRY_BACKOFF_SECONDS` is an **array** `[30, 60, 120]` — not a scalar.
- `SCAN_BLOCKED_DELAY_SECONDS` and `SCAN_ELIGIBLE_DELAY_SECONDS` are in **seconds** (hundreds, not tens of thousands).
- `START_TIMEOUT_SECONDS` ≥ 600 (cold starts can take 10+ min including IPFS and key issuance).
- `STOP_REQUEST_TIMEOUT_SECONDS` > 60 (stopping requires on-chain operations).
- `SCAN_LOADING_RETRY_SECONDS` ≤ 60 (short retry for transient loading).
- `RUNNING_AGENT_MAX_RUNTIME_SECONDS` is present and > 3600 (70min = 4200s is expected).
- `REWARDS_WAIT_TIMEOUT_SECONDS` is present and ≤ 30 (should be 20s).
- `DISABLE_RACE_STOP_CHECK_INTERVAL_MS` and `DISABLE_RACE_STOP_MAX_CHECKS` are present (disable-race guard).

### B9 — Safety Net (`useAutoRunLifecycle.ts`)

In the startup effect's `.finally()`:
```ts
.finally(() => {
  isRotatingRef.current = false;
  if (
    !reachedScan &&              // scan was never called (e.g. sleep bail-out)
    enabledRef.current &&        // auto-run still on
    !runningAgentTypeRef.current && // nothing running
    !hasScheduledScan()          // no scan already scheduled
  ) {
    scheduleNextScan(COOLDOWN_SECONDS);
  }
})
```
❌ Missing `!hasScheduledScan()` = double-scheduling after every sleep bail-out.
❌ Missing `!reachedScan` = safety net fires even when scanner ran normally.

### B10 — Disable-During-Start Race (`AutoRunProvider.tsx`)

A `useEffect` must watch `(enabled, runningAgentType, isStopping)`. When auto-run is disabled but `runningAgentType` is not null and no stop is already in progress, it must trigger a stop:

```ts
useEffect(() => {
  if (enabled) return;
  if (!runningAgentType) return;
  if (isStopping) return;
  // agent appeared running after disable was called — stop it
  stopCurrentRunningAgent();
}, [enabled, runningAgentType, isStopping, stopCurrentRunningAgent]);
```

Without this: the narrow window where `startService` completes just as the user presses disable leaves an agent running with no further stop ever attempted.

### B11 — Notification Deduplication (`useAutoRunOperations.ts`)

- `skipNotifiedRef` must be **reset to `{}`** when `enabled` becomes `false`:
  ```ts
  useEffect(() => {
    if (!enabled) { skipNotifiedRef.current = {}; }
  }, [enabled]);
  ```
  ❌ If absent: skip notifications won't re-fire after the user re-enables auto-run (same reason stays silently suppressed forever).

- `notifySkipOnce` must check `eligibility.reason !== ELIGIBILITY_REASON.LOADING` before notifying — Loading states must never produce a skip notification.

### B12 — Go/No-Go Quick Check

From `auto-run.md` section 11 — must-pass release blockers:

| # | Check | How to verify |
|---|---|---|
| 1 | Enable with eligible agent → starts within timeout | Log: agent started entry appears |
| 2 | Toggle OFF → running agent stops | Log: stop confirmation appears |
| 3 | Running agent earns rewards → stops → next eligible starts | Log: `rotation triggered` → stop → start |
| 4 | Loading states never show skip notification | Log: no `skip` with `Loading` in reason |
| 5 | Never runs more than one agent concurrently | Log: no two `started` without a `stopped` between them |
| 6 | Inclusion order and exclusions persist across restart | Check Electron store |
| 7 | No infinite waits — all waits have hard timeouts | B6 check |
| 8 | `infra_failed` does not advance scanner queue | B1 check |
| 9 | Stop failures use bounded recovery | B3/B4 check |
| 10 | Sleep/wake: stale delays abort; safety net reschedules | B6/B9 check |

---

## Output Format

```
## AutoRun Audit

### Part A — Runtime Diagnosis
{Only when log path provided}

#### Symptom identified
{Which row of A1 table matched}

#### Log Pattern Summary
{Results of A2 greps with counts and timestamps}

#### Backend Correlation
{A3 findings if infra_failed/fetch errors present}

---

### Part B — Code Audit

#### B1 — Scanner: INFRA_FAILED handling
✅/❌/⚠️ ...

#### B2 — startSelectedAgentIfEligible fallthrough
✅/❌/⚠️ ...

#### B3 — isRotatingRef guard
✅/❌/⚠️ ...

#### B4 — lastRewardsEligibilityRef guard
✅/❌/⚠️ ...

#### B5 — Epoch expiry normalization
✅/❌/⚠️ ...

#### B6 — Sleep-aware delays and wait helper guards
✅/❌/⚠️ ...

#### B7 — useCallback dependency arrays
✅/❌/⚠️ ...

#### B8 — Constants sanity
✅/❌/⚠️ ...

#### B9 — Safety net
✅/❌/⚠️ ...

#### B10 — Disable-during-start race guard
✅/❌/⚠️ ...

#### B11 — Notification deduplication
✅/❌/⚠️ ...

#### B12 — Go/No-Go checklist
✅/❌ per item

---

## Overall Status
{N} passed, {N} need attention, {N} critical.

Critical issues:
- ...

Recommended fixes:
- [ ] ...
```
