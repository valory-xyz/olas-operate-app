export const ONE_SECOND_INTERVAL = 1_000;
export const FIVE_SECONDS_INTERVAL = 5 * ONE_SECOND_INTERVAL;
export const TEN_SECONDS_INTERVAL = 10 * ONE_SECOND_INTERVAL;
export const FIFTEEN_SECONDS_INTERVAL = 15 * ONE_SECOND_INTERVAL;
export const THIRTY_SECONDS_INTERVAL = 30 * ONE_SECOND_INTERVAL;

export const ONE_MINUTE_INTERVAL = 60 * ONE_SECOND_INTERVAL;
export const FIVE_MINUTE_INTERVAL = 5 * ONE_MINUTE_INTERVAL;
export const FIFTEEN_MINUTE_INTERVAL = 15 * ONE_MINUTE_INTERVAL;
export const SIXTY_MINUTE_INTERVAL = 60 * ONE_MINUTE_INTERVAL;
export const ONE_DAY_INTERVAL = 24 * SIXTY_MINUTE_INTERVAL;

export const TWELVE_HOURS_IN_SECONDS = 12 * 60 * 60;

/**
 * Stall announce bar, compared against the server-computed
 * `healthcheck.seconds_since_last_transition`. Wall-clock, never poll-counted:
 * the deployment query's cadence varies and stops entirely on error.
 */
export const AGENT_STALL_ANNOUNCE_INTERVAL = 2 * ONE_MINUTE_INTERVAL;

/**
 * Headroom on top of a service's own `reset_pause_duration` before the pause
 * counts as a stall. The bar is the larger of the two.
 */
export const AGENT_STALL_PAUSE_MARGIN_INTERVAL = THIRTY_SECONDS_INTERVAL;
