# Auto-Run Scenarios (Happy Path + Edge Cases)

Use this file for step-by-step logical testing. Each case includes **Expected (feature)** and **Current code behavior** so we can reconcile later.

---

## Happy Path

### 1) Single agent, eligible, not yet running
- Preconditions: 1 agent onboarded, funded, eligible; auto-run OFF.
- Steps: Enable auto-run.
- Expected (feature): Selected agent starts immediately, runs, then waits for rewards.
- Current code: Starts selected if included; otherwise scans and starts.

### 2) Three agents, all eligible
- Preconditions: 3 agents included, all funded and eligible.
- Steps: Enable auto-run.
- Expected (feature): Start selected → rotate to next → rotate to next → cooldown 30m → repeat.
- Current code: Follows included order, rotates on rewards, 30m cooldown when all earned rewards.

---

## Funding / Balance Cases

### 3) 1 agent, onboarded but not funded (Low balance)
- Steps: Enable auto-run.
- Expected (feature): Skip with “Low balance” notice, cooldown 30m, retry.
- Current code: Skips with notification, uses **blocked scan delay (10m)**, not 30m.

### 4) 1 agent, earned rewards (no other candidates)
- Steps: Auto-run is on; agent earns rewards.
- Expected (feature): Keep running; rescan later (30m).
- Current code: Keeps running and schedules 30m rescan when no other agents (or all earned/unknown).

### 5) Mixed funding
- Preconditions: 3 agents; 1 low balance, 2 funded.
- Steps: Enable auto-run.
- Expected: Skip low balance once; start funded agents; cooldown when all eligible finished.
- Current code: Skips low balance with notification; continues scan.

---

## Construction / Decommissioned / Exclusions

### 6) Under construction
- Preconditions: 3 agents, 1 under construction.
- Steps: Enable auto-run while user is on eligible agent.
- Expected: Start eligible, skip under construction with notification, run next.
- Current code: “Under construction” is a hard skip with notification.

### 7) Decommissioned agent
- Preconditions: 4 agents, 1 decommissioned.
- Steps: Open auto-run list.
- Expected: Decommissioned appears in excluded, not addable.
- Current code: Decommissioned is removed from eligible list; appears excluded.

### 8) User excluded agent
- Steps: Exclude agent via “-” button.
- Expected: Moves to excluded, can be re-added later.
- Current code: Stored in `userExcludedAgents`.

---

## Rewards / Rotation

### 9) Agent already earned rewards before start
- Steps: Enable auto-run with selected agent already earned.
- Expected: Skip without start, move to next.
- Current code: Skips via rewards snapshot.

### 10) Earns rewards while viewing another agent
- Steps: Auto-run on; user clicks a different agent in sidebar.
- Expected: Rotation still happens; sidebar can change automatically for running agent.
- Current code: Rotation based on running agent; sidebar selection can still be changed manually.

---

## Loading States (No Skips)

### 11) Balances loading
- Expected: Wait until balances ready; do not skip or notify.
- Current code: Waits; no skip notification; no hard timeout while auto-run is enabled.

### 12) Safe data loading
- Expected: Wait; do not skip.
- Current code: Treated as loading (no skip).

### 13) Services loading
- Expected: Wait; do not skip.
- Current code: Treated as loading (no skip).

### 14) Geo / Staking loading
- Expected: Wait; do not skip.
- Current code: Treated as loading (no skip).

---

## Start / Stop Failures

### 15) Start fails
- Expected: Retry with backoff, then skip/notify.
- Current code: Retries with backoff; notifies start failed after retries.

### 16) Stop fails
- Expected: Timeout; no infinite loop; surface error.
- Current code: Timeout logs; rotation aborts.

---

## Login / Offline / Query Disabled

### 17) Auto-run enabled before login completes
- Expected: Wait, do not skip.
- Current code: Balances treated as loading until login; no skip.

### 18) Offline
- Expected: Wait or disable auto-run with notice.
- Current code: Treated as loading; no skip; no hard timeout while auto-run is enabled.

---

## Combinations

### 19) 3 agents: 2 eligible, 1 under construction
- Steps:
  1. User is on eligible agent.
  2. Auto-run starts it.
  3. Agent earns rewards.
  4. Agent 2 is under construction → skip + notify.
  5. Agent 3 eligible → start.
  6. All eligible completed → cooldown, then repeat.
- Expected: Skip only the under construction agent; cooldown 30m.
- Current code: Same flow, but cooldown depends on “all earned rewards”; blocked agents use 10m scan delay.

### 20) 2 agents: 1 eligible, 1 low balance
- Expected: Start eligible; skip low balance once; cooldown when eligible done.
- Current code: Low balance skipped; uses 10m delay when only blocked remain.

### 21) 1 agent: eligible but Safe loading
- Expected: Wait; no skip notification.
- Current code: Treated as loading (waits), no skip.

---

## Transient / Race Conditions

### 22) STOPPING race (Another agent running)
- Steps: Rotation triggers; previous agent is STOPPING while next is selected.
- Expected: Treated as transient wait; no skip or notification.
- Current code: “Another agent running” is treated as Loading (wait + rescan).

---

## Initialization

### 23) `includedAgents` list is empty — fallback to all eligible agents
- Preconditions: User has excluded all agents (or list was never populated).
- Steps: Enable auto-run.
- Expected: Auto-run still starts something; falls back to all configured, non-decommissioned agents.
- Current code: `getOrderedIncludedAgentTypes` returns `eligibleAgentTypes` when `includedAgentsSorted` is empty.

---

## Startup Cooldown

### 24) Cooldown after manual stop vs. first enable
- Preconditions: Auto-run is already on; running agent is stopped manually (not via rotation).
- Expected: Before rescanning, apply a short cooldown to avoid an immediate restart.
- Current code: `wasAutoRunEnabledRef` tracks whether auto-run was already on before the startup effect fires. On first enable it starts immediately; on subsequent startup triggers (agent stopped while auto-run is already on) it waits `COOLDOWN_SECONDS` before scanning.

---

## Eligibility Edge Cases

### 25) Stale “Loading: Balances” reason overridden by live balances context
- Preconditions: `useDeployability` returns `{ canRun: false, reason: 'Loading', loadingReason: 'Balances' }` from a stale render, but the balances context is already ready.
- Expected: Agent is treated as eligible (not stuck in a loading wait).
- Current code: `normalizeEligibility` checks `isOnlyLoadingReason(eligibility, 'Balances')` and, if `getBalancesStatus()` shows ready and not loading, overrides to `{ canRun: true }`.

---

## Sleep / Wake Recovery

### 26) Laptop sleep during cooldown or delay
- Preconditions: Auto-run is on; a delay (cooldown, start delay, retry backoff) is in progress.
- Steps: Close laptop lid → reopen after 30+ minutes.
- Expected: Detect the time drift, abort the stale delay, and let the orchestration loop restart with fresh state instead of cycling through agents with stale data.
- Current code: All delays use `sleepAwareDelay()` which compares actual elapsed time against `expected + 30 s`. If drift exceeds this threshold, returns `false`; callers bail out cleanly.

### 27) Laptop sleep during wait loops
- Preconditions: Auto-run is on; a wait loop (agent selection, balances, eligibility, running/stopped) is polling.
- Steps: Close laptop lid → reopen.
- Expected: Detect sleep via drift on the polling delay; return `false` so the orchestration loop can restart.
- Current code: Every `sleepAwareDelay()` call inside wait loops checks for drift and returns `false` on detection.

### 28) Stale balance data after wake
- Preconditions: Balances were fetched before sleep; `balancesReadyRef` is `true`.
- Steps: Close laptop lid → reopen after > 60 s.
- Expected: Balance data is detected as stale; refetch triggered before proceeding.
- Current code: `balanceLastUpdatedRef` tracks when `isBalancesAndFundingRequirementsReadyForAllServices` last changed. `waitForBalancesReady()` checks freshness (`< 60 s`); if stale, triggers a refetch and waits for fresh data.

---

## Notes for Future Unit Tests

- Mock `getSelectedEligibility` states (Loading / Low balance / Evicted / Eligible).
- Mock rewards snapshots (undefined / false / true).
- Verify rotation triggers only on false -> true.
- Verify no notifications for Loading reasons.
- Verify no infinite loops (timeouts or rescan scheduling).
- Verify sleep/wake detection aborts in-flight waits and delays.
