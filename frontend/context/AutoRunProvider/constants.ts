/**
 * Prefix prepended to all auto-run log messages for easy filtering in logs.
 * Example: "autorun:: rotation triggered: trader earned rewards"
 */
export const AUTO_RUN_LOG_PREFIX = 'autorun:';

/**
 * Seconds to wait after stopping an agent before starting the next one during rotation.
 * Gives the backend time to fully tear down the running service before a new one starts.
 * e.g. Agent A earns rewards → stop A → wait 20 s → start Agent B
 */
export const COOLDOWN_SECONDS = 20; // 20 seconds

/**
 * Delay (in seconds) before auto-run starts after the user enables it.
 * This gives users a brief window to include/exclude agents.
 * Example: toggle ON → wait 30s → start selected/next eligible agent.
 */
export const AUTO_RUN_START_DELAY_SECONDS = 30; // 30 seconds

/**
 * Progressive back-off delays (in seconds) between consecutive start retries.
 * e.g. 1st retry after 30 s, 2nd after 60 s, 3rd+ after 120 s
 */
export const RETRY_BACKOFF_SECONDS = [30, 60, 120]; // 30s, 1m, 2m

/**
 * How often (in seconds) the rewards-eligibility poller checks whether the
 * running agent has earned its staking rewards for the current epoch.
 * e.g. every 120 s → fetch rewards info → compare snapshot → trigger rotation if earned
 */
export const REWARDS_POLL_SECONDS = 120; // 2 minutes

/**
 * How long (in seconds) to wait before re-scanning for a runnable agent when
 * the last scan found at least one agent that was blocked (e.g. low balance,
 * no slots, evicted). A shorter delay is used because the blocking condition
 * may resolve soon (funds topped up, slot freed, etc.).
 */
export const SCAN_BLOCKED_DELAY_SECONDS = 10 * 60; // 10 minutes

/**
 * How long (in seconds) to wait before re-scanning when the last scan found
 * at least one eligible agent (or the running agent just earned its rewards
 * and no other agent could be started). A longer delay is used because there
 * is nothing actionable to do until the next epoch window opens.
 */
export const SCAN_ELIGIBLE_DELAY_SECONDS = 30 * 60; // 30 minutes

/**
 * How long (in seconds) to wait before retrying when a scan or start attempt
 * was skipped due to a transient loading state (e.g. eligibility timed out,
 * or eligibility is still in a loading reason after the wait).
 * Example: scan hits "Loading: Balances" → retry scan in 30s.
 */
export const SCAN_LOADING_RETRY_SECONDS = 30; // 30 seconds

/**
 * Maximum time (in seconds) to wait for sidebar selection to match a candidate.
 * Example: scanner picks `trader` and waits until UI selection + details are ready.
 */
export const AGENT_SELECTION_WAIT_TIMEOUT_SECONDS = 60; // 1 minute

/**
 * Maximum time (in seconds) to wait for rewards snapshot after selecting agent.
 * Example: selection changed to `optimus`, wait up to 20s for rewards snapshot.
 */
export const REWARDS_WAIT_TIMEOUT_SECONDS = 20; // 20 seconds

/**
 * How long (in seconds) to wait for a service to reach DEPLOYED state after
 * `startService()` is called. Initial deployments can be slow (safe creation,
 * service registration, on-chain funding) so this must be generous.
 */
export const START_TIMEOUT_SECONDS = 60 * 15; // 15 minutes

/**
 * How many times auto-run retries stopping the same running service before
 * backing off and retrying later.
 * Example: try stop up to 3 times before giving up this cycle.
 */
export const STOP_RECOVERY_MAX_ATTEMPTS = 3;

/**
 * Delay (in seconds) between stop recovery attempts.
 * Example: stop attempt 1 fails → wait 60s → attempt 2.
 */
export const STOP_RECOVERY_RETRY_SECONDS = 60; // 1 minute

/**
 * Maximum time (in seconds) for the stop request API call itself.
 * Note: actual stop confirmation is still handled separately via deployment polling.
 */
export const STOP_REQUEST_TIMEOUT_SECONDS = 300; // 5 minutes

/**
 * Start-attempt outcome labels shared between controller and scanner.
 * Example flow:
 * - "started"       → agent deployed and running
 * - "agent_blocked" → deterministic blocker (low balance, evicted, etc.)
 * - "infra_failed"  → transient failure (RPC/network/start timeout)
 * - "aborted"       → auto-run disabled or flow interrupted
 */
export const AUTO_RUN_START_STATUS = {
  STARTED: 'started',
  AGENT_BLOCKED: 'agent_blocked',
  INFRA_FAILED: 'infra_failed',
  ABORTED: 'aborted',
} as const;

/** Union type of all values in `AUTO_RUN_START_STATUS`. */
export type AutoRunStartStatus =
  (typeof AUTO_RUN_START_STATUS)[keyof typeof AUTO_RUN_START_STATUS];

/**
 * Structured result for a single start attempt.
 * Example: `{ status: 'infra_failed', reason: 'TypeError: Failed to fetch' }`.
 */
export type AutoRunStartResult = {
  status: AutoRunStartStatus;
  reason?: string;
};

/**
 * Eligibility reason labels used by deployability and auto-run.
 * Example:
 * - `LOADING` means data still pending (balances/safe/staking/geo)
 * - `ANOTHER_AGENT_RUNNING` is normalized as transient loading during rotation
 */
export const ELIGIBILITY_REASON = {
  LOADING: 'Loading',
  ANOTHER_AGENT_RUNNING: 'Another agent running',
} as const;

/**
 * Sub-reasons used when `ELIGIBILITY_REASON.LOADING` is returned.
 * Example: reason="Loading", loadingReason="Balances".
 */
export const ELIGIBILITY_LOADING_REASON = {
  BALANCES: 'Balances',
} as const;
