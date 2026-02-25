/** Prefix prepended to all auto-run log messages for easy filtering in the console. */
export const AUTO_RUN_LOG_PREFIX = 'autorun:';

/**
 * Seconds to wait after stopping an agent before starting the next one during rotation.
 * Gives the backend time to fully tear down the running service before a new one starts.
 * e.g. Agent A earns rewards → stop A → wait 20 s → start Agent B
 */
export const COOLDOWN_SECONDS = 20;

/**
 * Progressive back-off delays (in seconds) between consecutive start retries.
 * e.g. 1st retry after 15 s, 2nd after 30 s, 3rd+ after 60 s
 */
export const RETRY_BACKOFF_SECONDS = [15, 30, 60];

/**
 * How often (in seconds) the rewards-eligibility poller checks whether the
 * running agent has earned its staking rewards for the current epoch.
 * e.g. every 60 s → fetch rewards info → compare snapshot → trigger rotation if earned
 */
export const REWARDS_POLL_SECONDS = 60; // 1 minute

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
 * Value: 30 minutes
 */
export const SCAN_ELIGIBLE_DELAY_SECONDS = 30 * 60; // 30 minutes

/** Eligibility reason labels used by deployability and auto-run. */
export const ELIGIBILITY_REASON = {
  LOADING: 'Loading',
  ANOTHER_AGENT_RUNNING: 'Another agent running',
} as const;

export const ELIGIBILITY_LOADING_REASON = {
  BALANCES: 'Balances',
} as const;
