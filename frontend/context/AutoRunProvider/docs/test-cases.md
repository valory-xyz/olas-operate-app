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
    - Current: Retries `RETRY_BACKOFF_SECONDS`, then notifies start failed.

25. **Stop fails**
    - Expected: Timeout and log; avoid infinite loop.
    - Current: `waitForStoppedAgent` timeout logs and aborts rotation.

26. **Rewards API fails**
    - Expected: Log error, continue; do not block auto-run.
    - Current: Logged; snapshot remains undefined.

---

## Infinite Loop Guards

27. **Eligibility stuck loading**
    - Expected: Timeout and rescan; no skip notifications.
    - Current: 60s timeout, rescan in 30s (scanner path). Direct start path returns false.

28. **Balances query disabled (offline / not logged in)**
    - Expected: Wait until enabled; no skip.
    - Current: Treated as loading; no skip. `waitForBalancesReady` exits cleanly when `enabledRef.current` becomes false (no infinite hang). No hard time-based timeout; it waits until balances are ready or auto-run is disabled.

29. **Single agent earns rewards (no other candidates)**
    - Expected: Keep running current agent; schedule long rescan (30m).
    - Current: Rotation checks other agents; if none or all earned/unknown, keeps running and schedules 30m scan.

30. **STOPPING race (Another agent running)**
    - Expected: Treat as transient; wait and retry, no skip notification.
    - Current: “Another agent running” treated as Loading; no skip.

31. **Auto-run disabled during waits**
    - Expected: Any wait loop exits early.
    - Current: waitForAgentSelection / waitForBalancesReady return false when disabled.

32. **Auto-run disabled during retries**
    - Expected: Further retries stop; no new starts after disable.
    - Current: start retries check `enabledRef` each iteration.

---

## Wait Loop Guardrails (No Hard Timeouts)

These waits are guarded by `enabledRef.current`, but do not all have time-based timeouts:

- **waitForAgentSelection()** — guarded by `enabledRef.current`; exits and returns `false` when auto-run is disabled. Still has no hard time-based timeout if auto-run stays enabled and selection never resolves (e.g. service config mismatch). Acceptable because the user can disable auto-run to unblock.

- **waitForBalancesReady()** — guarded by `enabledRef.current`; exits when disabled. Same caveat: no hard timeout while enabled.

- **waitForRunningAgent() / waitForStoppedAgent()** — both have explicit time-based timeouts (`START_TIMEOUT_SECONDS`). Log and return `false` on expiry; rotation aborts cleanly.

- **waitForRewardsEligibility()** — 20 s hard timeout (`REWARDS_WAIT_TIMEOUT_SECONDS`); returns `undefined` and logs if snapshot never arrives.

- **waitForEligibilityReady()** — 60 s hard timeout (`ELIGIBILITY_WAIT_TIMEOUT_MS`); then reschedules scan in 30 s.

---

## New Cases

33. **`includedAgents` list is empty — fallback to eligible agents**
    - Expected: Auto-run still starts something; uses full eligible (non-decommissioned) list.
    - Current: `getOrderedIncludedAgentTypes` returns `eligibleAgentTypes` when `includedAgentsSorted` is empty.

34. **Cooldown after manual stop vs. first enable**
    - Expected: First enable → start immediately. Agent stops while auto-run stays on → wait `COOLDOWN_SECONDS` before rescanning.
    - Current: `wasAutoRunEnabledRef` tracks prior enabled state; cooldown applied only on re-entry (not on first enable).

35. **Stale "Loading: Balances" overridden by live balances context**
    - Expected: Not stuck in a loading wait if balances context is already ready.
    - Current: `normalizeEligibility` detects when `loadingReason` is only `'Balances'` and `getBalancesStatus()` shows ready; overrides to `{ canRun: true }`.

36. **Rewards snapshot timeout (20 s)**
    - Expected: If rewards API never returns after a fresh snapshot was cleared, auto-run continues without blocking.
    - Current: `waitForRewardsEligibility` returns `undefined` after `REWARDS_WAIT_TIMEOUT_SECONDS = 20`; scanner treats `undefined` snapshot as "not yet earned" and proceeds.

---

## Known Gaps / TODOs

- Backend start can hang without timeout beyond `waitForRunningAgent`.
- Rewards eligibility is selection-driven; polling used as a workaround.
- `waitForAgentSelection` and `waitForBalancesReady` have no hard time-based timeout while auto-run is enabled (only `enabledRef` guard). Acceptable for MVP.
- Four locations contain a hardcoded `30`-second loading-retry rescan delay; should be extracted to a named constant (e.g. `SCAN_LOADING_RETRY_SECONDS`).

---

## Open Bugs

### P1 — `waitForRewardsEligibility` missing `enabledRef` guard (`useAutoRunSignals.ts`)
- Every other while loop exits when disabled. This one uses only a 20 s hard timeout, so it can run up to 20 s after auto-run is disabled.
- Fix: add `&& enabledRef.current` to the while condition alongside the timeout.

### P1 — `skipNotifiedRef` never cleared (`useAutoRunController.ts`)
- Accumulates `agentType → reason` entries but is never reset — not on toggle off, not on scan cycle end.
- Effect: if an agent is skipped for "Low balance", the user tops up, auto-run is re-enabled and balance drops again later — no notification fires because the reason is still stored.
- Fix: clear `skipNotifiedRef.current = {}` in the `useEffect` block that handles `!enabled`.

### P2 — `rotateToNext` stops the agent even when auto-run was disabled mid-rotation (`useAutoRunController.ts`)
- `enabledRef` is checked only **after** `stopAgent` completes. If disabled between rewards detection and the stop call, the running service is stopped without user intent.
- Fix: add `if (!enabledRef.current) return;` immediately before the `stopAgent` call.

### P2 — `waitForRunningAgent` / `waitForStoppedAgent` lack `enabledRef` guard (`useAutoRunSignals.ts`)
- Both loop for up to 120 s regardless of enabled state; adds unnecessary backend polling after disable.
- Fix: add `enabledRef.current` to both while conditions.

### P3 — `isRotatingRef` set asynchronously in rotation effect (`useAutoRunController.ts`)
- Set to `true` only after `await refreshRewardsEligibility()` resolves; rapid `rewardsTick` increments can transiently allow two invocations to both see `false`, both calling `checkRewardsAndRotate`. `isActive` prevents double-rotation in most paths but both writes to `lastRewardsEligibilityRef` can prematurely suppress a valid rotation.
- Fix: set `isRotatingRef.current = true` synchronously before the first `await`, matching the startup effect.

