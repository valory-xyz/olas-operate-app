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
    - Current: 60s timeout, rescan in 30s.

28. **Balances query disabled (offline / not logged in)**
    - Expected: Wait until enabled; no skip.
    - Current: Treated as loading; no skip; rescan.

---

## Infinite Loop Risks (Needs Guardrails)

These are potential infinite waits in current logic (should be addressed in code cleanup):

- **waitForAgentSelection() has no timeout**
  - If selection never matches (service config mismatch, services not loaded), the loop can wait forever.
  - Suggested guard: 30–60s timeout → rescan with backoff.

- **waitForBalancesReady() has no timeout**
  - If balances query never enables (not logged in / offline) or stalls, auto-run can wait forever.
  - Suggested guard: 30–60s timeout → rescan with backoff, or disable auto-run with user notice.

- **waitForRunningAgent() / waitForStoppedAgent()**
  - Has timeouts, but if backend keeps flapping, rotation can retry endlessly.
  - Suggested guard: track retry counts per agent and back off or pause auto-run.

---

## Known Gaps / TODOs

- Backend start can hang without timeout beyond `waitForRunningAgent`.
- Rewards eligibility is selection-driven; polling used as a workaround.
- Additional UI feedback for long waits could be added (optional).
