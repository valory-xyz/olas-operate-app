# Auto-Run Test Cases

This checklist is organized as: **Scenario**, **Expected behavior**, **Current implementation behavior**, **Notes**.

---

## Core Flow

1. **Enable auto-run (no agent running, selected agent eligible)**
   - Expected: Selected agent starts immediately.
   - Current: `startSelectedAgentIfEligible()` runs first; if eligible, starts.
   - Notes: Uses `waitForEligibilityReady()` then `startAgentWithRetries()`.

2. **Enable auto-run (selected agent not eligible)**
   - Expected: Scan next eligible in order and start it.
   - Current: Scans included list in order; skips blocked agents with notification (unless loading).
   - Notes: `scanAndStartNext()` in `useAutoRunScanner`.

3. **Enable auto-run while an agent is already running**
   - Expected: No new start; wait for rewards, then rotate.
   - Current: `useAgentRunning` prevents concurrent start; rewards rotation loop runs.

4. **Disable auto-run while an agent is running**
   - Expected: Stop running agent; switch shows loading while stopping.
   - Current: `setEnabled(false)` stops current service and sets `isStopping`.

---

## Rotation & Rewards

5. **Agent earns rewards**
   - Expected: Stop agent, cooldown, start next eligible.
   - Current: Rewards snapshot transition false->true triggers `rotateToNext()`.

6. **Agent already earned rewards before auto-run starts**
   - Expected: Skip and move to next eligible.
   - Current: Rewards snapshot check in `startSelectedAgentIfEligible` and `scanAndStartNext`.

7. **All eligible agents already earned rewards**
   - Expected: Wait 30 minutes, rescan.
   - Current: `SCAN_ELIGIBLE_DELAY_SECONDS = 30 * 60`.

---

## Eligibility Checks

8. **Blocked: Low balance**
   - Expected: Skip with notification (once per reason).
   - Current: Skipped with notification; no infinite loops.

9. **Blocked: Evicted**
   - Expected: Skip with notification.
   - Current: Skipped with notification via deployability.

10. **Blocked: Region restricted**
    - Expected: Skip with notification.
    - Current: Skipped with notification via deployability.

11. **Blocked: No slots**
    - Expected: Skip with notification.
    - Current: Skipped with notification via deployability.

12. **Blocked: Under construction**
    - Expected: Skip with notification.
    - Current: Skipped with notification via deployability.

13. **Safe not ready (Safe data loading)**
    - Expected: **Wait** (do not skip).
    - Current: Loading is treated as wait; no skip notifications.

---

## Loading States (No Skips)

14. **Balances loading**
    - Expected: Wait, do not skip.
    - Current: Treated as loading; no skip notification; rescan after short delay.

15. **Staking details loading**
    - Expected: Wait, do not skip.
    - Current: Treated as loading; no skip notification.

16. **Geo restriction loading**
    - Expected: Wait, do not skip.
    - Current: Treated as loading; no skip notification.

17. **Services loading**
    - Expected: Wait, do not skip.
    - Current: Treated as loading; no skip notification.

---

## Order, Inclusion, Exclusion

18. **Decommissioned agent**
    - Expected: Auto-excluded, cannot be added.
    - Current: Not included in eligible list; appears in excluded list.

19. **User excludes an agent**
    - Expected: Moves to excluded list; can be re-included.
    - Current: Stored in `userExcludedAgents`.

20. **User re-includes an excluded agent**
    - Expected: Reappears in included list (order preserved or appended).
    - Current: Appends if missing, otherwise removes from excluded.

21. **Order persistence after restart**
    - Expected: Same included order.
    - Current: Stored in Electron Store; normalized on load.

---

## UI Behavior

22. **Auto-run switch loading state**
    - Expected: Loading while starting/stopping.
    - Current: `isStarting || isStopping` controls switch loading.

23. **Sidebar manual navigation**
    - Expected: User can browse other agents while auto-run runs.
    - Current: Sidebar selection is user-controlled; auto-run changes selection only for start.

---

## Failure Handling

24. **Start fails**
    - Expected: Retry with backoff, then skip.
    - Current: Retries `RETRY_BACKOFF_SECONDS`; on repeated transport/timeouts it marks transient infra failure and schedules short rescan without advancing queue to a different agent.

25. **Stop fails**
    - Expected: Timeout and log; avoid infinite loop; auto-run recovers.
    - Current: `stopAgentWithRecovery` retries stop with bounded attempts and deployment-status polling. If still unresolved, logs timeout, resets `lastRewardsEligibilityRef[agent]`, and schedules rescan in `SCAN_BLOCKED_DELAY_SECONDS` (10 min).
    - Notes: No next-agent start is attempted before stop is confirmed.

26. **Disable while stop recovery is in progress**
    - Expected: Stop recovery keeps running until timeout/success; disable should not abort stop checks midway.
    - Current: Stop confirmation + recovery no longer depend on `enabledRef`, so manual disable cannot prematurely cut stop retries.

27. **Rewards API fails**
    - Expected: Log error, continue; do not block auto-run.
    - Current: Logged; snapshot remains undefined.

---

## Infinite Loop Guards

28. **Eligibility stuck loading**
    - Expected: Timeout and rescan; no skip notifications.
    - Current: 60s timeout, rescan in 30s (scanner path). Direct start path returns false.

29. **Balances query disabled (offline / not logged in)**
    - Expected: Wait until enabled; no skip.
    - Current: Treated as loading; no skip. `waitForBalancesReady` exits cleanly when `enabledRef.current` becomes false (no infinite hang). No hard time-based timeout; it waits until balances are ready or auto-run is disabled.

30. **Single agent earns rewards (no other candidates)**
    - Expected: Keep running current agent; schedule long rescan (30m).
    - Current: Rotation checks other agents; if none or all earned/unknown, keeps running and schedules 30m scan.

31. **STOPPING race (Another agent running)**
    - Expected: Treat as transient; wait and retry, no skip notification.
    - Current: “Another agent running” treated as Loading; no skip.

32. **Auto-run disabled during waits**
    - Expected: Any wait loop exits early.
    - Current: waitForAgentSelection / waitForBalancesReady return false when disabled.

33. **Auto-run disabled during retries**
    - Expected: Further retries stop; no new starts after disable.
    - Current: start retries check `enabledRef` each iteration.

---

## Wait Loop Guardrails (No Hard Timeouts)

These waits are guarded by `enabledRef.current` and `sleepAwareDelay()`, but do not all have time-based timeouts:

- **waitForAgentSelection()** — guarded by `enabledRef.current` and sleep detection; exits and returns `false` when auto-run is disabled or sleep is detected. Still has no hard time-based timeout if auto-run stays enabled and selection never resolves (e.g. service config mismatch). Acceptable because the user can disable auto-run to unblock.

- **waitForBalancesReady()** — guarded by `enabledRef.current` and sleep detection; exits when disabled or sleep detected. Also checks balance freshness (`balanceLastUpdatedRef` < 60 s) and triggers refetch if stale. Same caveat: no hard timeout while enabled.

- **waitForRunningAgent()** — explicit time-based timeout (`START_TIMEOUT_SECONDS`) plus sleep detection.
- **Stop confirmation** — bounded deployment-status polling with `START_TIMEOUT_SECONDS` per attempt plus sleep detection.

- **waitForRewardsEligibility()** — 20 s hard timeout (`REWARDS_WAIT_TIMEOUT_SECONDS`) plus sleep detection; returns `undefined` and logs if snapshot never arrives.

- **waitForEligibilityReady()** — 60 s hard timeout (`ELIGIBILITY_WAIT_TIMEOUT_MS`) plus sleep detection; then reschedules scan in 30 s.

---

## New Cases

34. **`includedAgents` list is empty — fallback to eligible agents**
    - Expected: Auto-run still starts something; uses full eligible (non-decommissioned) list.
    - Current: `getOrderedIncludedAgentTypes` returns `eligibleAgentTypes` when `includedAgentsSorted` is empty.

35. **Cooldown after manual stop vs. first enable**
    - Expected: First enable → start immediately. Agent stops while auto-run stays on → wait `COOLDOWN_SECONDS` before rescanning. Try to resume the previously-running agent first; if it can't run, scan for the next.
    - Current: `wasAutoRunEnabledRef` tracks prior enabled state; cooldown applied only on re-entry (not on first enable). After cooldown, tries `startSelectedAgentIfEligible` (resume previously-running agent) then falls through to `scanAndStartNext`.

36. **Stale "Loading: Balances" overridden by live balances context**
    - Expected: Not stuck in a loading wait if balances context is already ready.
    - Current: `normalizeEligibility` detects when `loadingReason` is only `'Balances'` and `getBalancesStatus()` shows ready; overrides to `{ canRun: true }`.

37. **Rewards snapshot timeout (20 s)**
    - Expected: If rewards API never returns after a fresh snapshot was cleared, auto-run continues without blocking.
    - Current: `waitForRewardsEligibility` returns `undefined` after `REWARDS_WAIT_TIMEOUT_SECONDS = 20`; scanner treats `undefined` snapshot as "not yet earned" and proceeds.

---

## Sleep / Wake Recovery

38. **Sleep during cooldown delay**
    - Expected: On wake, `sleepAwareDelay` detects time drift (> expected + 30 s), returns `false`; rotation/startup aborts cleanly without cycling.
    - Current: All cooldown and startup delays use `sleepAwareDelay()`; callers check return value and bail with a log message on `false`.

39. **Sleep during wait loop polling**
    - Expected: On wake, `sleepAwareDelay(2)` or `sleepAwareDelay(5)` inside wait loops detects drift, returns `false`; wait function returns `false`; caller aborts cleanly.
    - Current: All async polling waits use `sleepAwareDelay` and check its return value, including selection, balances, rewards, running confirmation, and eligibility checks.

40. **Stale balance data after wake**
    - Expected: Balances fetched > 60 s ago are treated as stale; refetch triggered before proceeding.
    - Current: `balanceLastUpdatedRef` tracks freshness; `waitForBalancesReady` checks `isFresh()` and triggers `refetch()` when stale.

41. **Sleep during retry backoff**
    - Expected: On wake, retry backoff delay detects drift, returns `false`; start attempt aborts without further retries.
    - Current: `startAgentWithRetries` uses `sleepAwareDelay(RETRY_BACKOFF_SECONDS[attempt])` and returns `false` on drift detection.

42. **Resume previously-running agent after wake**
    - Expected: If agent A was running before sleep and stopped during sleep, auto-run tries to restart A first. If A is still eligible (rewards not earned, funded), it restarts. If not, falls through to scanning.
    - Current: `wasEnabled=true` path now calls `startSelectedAgentIfEligible` before `scanAndStartNext`. Since `selectedAgentType` is still set to agent A (via `updateAgentType` / `lastSelectedAgentType` persistence), it gets resume priority.

43. **Resume agent that earned rewards during sleep**
    - Expected: If agent A earned rewards while sleeping, resume attempt fails (rewards check returns `true`), falls through to normal scan and starts the next eligible agent.
    - Current: `startSelectedAgentIfEligible` checks rewards snapshot; if `true`, returns `false` and scan proceeds.

---

## Stop Timeout Recovery

44. **Stop timeout during rotation — auto-run recovers**
    - Expected: If stop confirmation times out during `rotateToNext`, auto-run does not go permanently dormant. A rescan is scheduled and future rotations are not blocked.
    - Current: On stop timeout, `lastRewardsEligibilityRef[agent]` is reset to `undefined` and `scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS)` (10 min) is called. This ensures auto-run can try again later.
    - Notes: Previously this was the root cause of all "stuck agent" reports (P0 deadlock fix below).

45. **Stop timeout — rewards rotation guard reset**
    - Expected: After a stop timeout, the `lastRewardsEligibilityRef` guard for the agent that earned rewards must be cleared so subsequent reward events can re-trigger rotation.
    - Current: `lastRewardsEligibilityRef[currentAgentType] = undefined` on stop timeout. Without this reset, the `previousEligibility === true` guard in the rotation effect would permanently block all future rotation attempts for that agent.

46. **Balances stale log deduplication**
    - Expected: "balances stale, triggering refetch" is logged at most once per staleness window, not on every poll iteration.
    - Current: `didLogStaleRef` prevents duplicate log messages. Reset when `isBalancesAndFundingRequirementsReadyForAllServices` changes (i.e., when balance data actually updates).

---

## Known Gaps / TODOs

- Backend start can hang without timeout beyond `waitForRunningAgent`.
- Rewards eligibility is selection-driven; polling used as a workaround.
- `waitForAgentSelection` and `waitForBalancesReady` have no hard time-based timeout while auto-run is enabled (only `enabledRef` guard). Acceptable for MVP.

---

---

## Fixed Bugs

### P1 — `waitForRewardsEligibility` missing `enabledRef` guard ✓
- Added `&& enabledRef.current` to the while condition in `useAutoRunSignals.ts`.
- Loop now exits immediately on disable (returns `undefined`); callers proceed without blocking.

### P1 — `skipNotifiedRef` never cleared ✓
- Added `useEffect(() => { if (!enabled) skipNotifiedRef.current = {}; }, [enabled])` in `useAutoRunController.ts`.
- Skip notifications now reset on each disable so they fire correctly on re-enable.

### P2 — `rotateToNext` stops agent when disabled mid-rotation ✓
- Added `if (!enabledRef.current) return;` before `stopAgent(...)` in `useAutoRunController.ts`.
- Disabling auto-run mid-rotation now aborts before stopping the running service.

### P2 — `waitForRunningAgent` lacked `enabledRef` guard ✓
- Added `enabledRef.current` to the loop condition in `useAutoRunSignals.ts`.
- Timeout log is suppressed when exit is due to disable (not a real timeout).

### P3 — Rotation effect race on `isRotatingRef` ✓
- `isRotatingRef.current` is now set to `true` before the first await in the rewards rotation path.
- This prevents overlapping reward-triggered rotation checks under rapid tick updates.

### Code — `isLoadingReason` misleading variable name in `normalizeEligibility` ✓
- Replaced intermediate variable with direct `if (!isOnlyLoadingReason(...))` inline check in `useAutoRunScanner.ts`, matching the controller version.

### Code — 4 hardcoded `scheduleNextScan(30)` magic numbers ✓
- Added `SCAN_LOADING_RETRY_SECONDS = 30` to `constants.ts`.
- All 4 occurrences in `useAutoRunScanner.ts` replaced with the named constant.

### Code — `if (!stopRunningAgent) return` dead code ✓
- Removed unreachable guard from `AutoRunProvider.tsx`; `stopRunningAgent` is always defined.

### P1 — Sleep/wake causes chaotic agent cycling ✓
- **Root cause**: `Date.now()` jumps forward after laptop sleep, causing all `delayInSeconds`/wait loops to expire instantly. Balance data remains stale (`balancesReadyRef` was `true` from before sleep). This led to rapid cycling through all agents with stale "Low balance" data and eventually starting the wrong agent.
- **Fix**:
  1. Added `sleepAwareDelay()` utility in `frontend/utils/delay.ts` — compares actual elapsed time against expected + 30 s threshold. Returns `false` on drift (sleep detected).
  2. Replaced all `delayInSeconds()` calls in wait loops and cooldown delays across `useAutoRunSignals.ts`, `useAutoRunController.ts`, and `useAutoRunScanner.ts` with `sleepAwareDelay()`. Each caller checks the return value and bails out on `false`.
  3. Added `balanceLastUpdatedRef` in `useAutoRunSignals.ts` to track when balance data was last updated. `waitForBalancesReady()` now checks freshness (< 60 s) and triggers a refetch when stale (e.g. after sleep).
  4. Added safety net in startup effect `.finally()` — if auto-run is still enabled but nothing started, schedules a rescan to prevent dead orchestration loops.

### P2 — Sleep/wake starts wrong agent instead of resuming ✓
- **Root cause**: When auto-run was already enabled and the running agent stopped (e.g. during sleep), the `wasEnabled=true` path went straight to `scanAndStartNext` without trying to resume the previously-running agent. The scanner would iterate from a different position and start a different agent.
- **Fix**: The `wasEnabled=true` path now calls `startSelectedAgentIfEligible` before `scanAndStartNext`. Since `selectedAgentType` is persisted to `lastSelectedAgentType` (electron store) whenever auto-run starts an agent, it still points to the previously-running agent after wake. If that agent is still eligible, it gets restarted. If not (earned rewards, low balance, etc.), normal scanning proceeds.

### P0 — Stop timeout causes permanent auto-run deadlock ✓
- **Root cause**: When stop confirmation timed out during `rotateToNext`, the function returned early without scheduling a rescan. Simultaneously, `lastRewardsEligibilityRef[agent]` remained set to `true`, which caused the `previousEligibility === true` guard in the rotation effect to permanently block all future rotation triggers for that agent. The net result: auto-run went permanently dormant — no rescan, no rotation, no recovery. This was the root cause of all "stuck agent" reports across 6 client log files (including one user who only ran 1 agent in 24 hours).
- **Fix**:
  1. On stop timeout in `rotateToNext`: reset `lastRewardsEligibilityRef[currentAgentType]` to `undefined` so future reward events can re-trigger rotation.
  2. Schedule `scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS)` (10 min) so auto-run retries instead of going dormant.
  3. Added diagnostic logging at key decision points: scan completion summary, all-agents-earned path, safety net activation.

### P0 — Transient start failures rotated queue to wrong agent ✓
- **Root cause**: scanner treated all `startAgentWithRetries` failures as generic blocked candidate and immediately advanced queue, including transient transport errors (`Failed to fetch`) and running timeouts.
- **Fix**:
  1. `startAgentWithRetries` now returns structured status: `started | agent_blocked | infra_failed | aborted`.
  2. Scanner handles `infra_failed` by scheduling a short retry scan and **not advancing queue**.
  3. Selected-agent startup path also pauses on `infra_failed` and avoids immediate fallback scan to a different agent.

### P0 — Stop recovery lacked bounded retries/status confirmation ✓
- **Root cause**: stop path issued one stop attempt and relied on derived running-agent signal; repeated backend hiccups caused rotation instability.
- **Fix**:
  1. Added bounded stop recovery (`STOP_RECOVERY_MAX_ATTEMPTS`, `STOP_RECOVERY_RETRY_SECONDS`).
  2. Stop confirmation now polls deployment status endpoint and treats `DEPLOYED/DEPLOYING/STOPPING` as still active.
  3. If recovery still fails, auto-run backs off with scheduled rescan; no immediate next-agent start.

### Code — Balances stale log spam ✓
- **Problem**: "balances stale, triggering refetch" was logged on every poll iteration during wait loops, flooding logs with identical messages.
- **Fix**: Added `didLogStaleRef` in `useAutoRunSignals.ts`. The stale message is logged once per staleness window; `didLogStaleRef` resets when `isBalancesAndFundingRequirementsReadyForAllServices` changes.
