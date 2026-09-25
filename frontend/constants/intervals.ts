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
 * Dwell thresholds for the stalled-agent surfaces (OPE-1941).
 *
 * Both are wall-clock and both are compared against the agent's own
 * `healthcheck.seconds_since_last_transition`, which the middleware computes
 * server-side. They must never be derived from counting polls or from elapsed
 * time accumulated in the renderer: the query that carries the healthcheck
 * (`ALL_SERVICE_DEPLOYMENTS_KEY`) polls every 5 s, 15 s or 50 s with a
 * deployment active, 15/45/150 s without one, and not at all while it is not
 * in a `success` state — so a poll-derived rule is wrong by up to 10x in the
 * background-window case this ticket describes, and undefined in the error
 * case.
 *
 * Deliberately far below the middleware's own bars, and that divergence is the
 * point: its health checker force-restarts after 60 failed 5 s probes (5 min),
 * and its failfast record only resets after 900 s of continuous health. Pearl
 * announces well before either, because the operator in OPE-1941 sat through
 * two full five-minute stalls with the UI still reporting normal operation.
 */
export const AGENT_STALL_ANNOUNCE_INTERVAL = 2 * ONE_MINUTE_INTERVAL;

/**
 * Headroom allowed on top of a service's own inter-cycle pause before the
 * pause counts as a stall.
 *
 * The announce threshold is
 * `max(AGENT_STALL_ANNOUNCE_INTERVAL, reset_pause_duration + this)`. Reading
 * the per-service field rather than assuming a flat number is load-bearing:
 * the shipped values differ threefold between Polystrat (90 s) and Omenstrat
 * (30 s), and `RESET_PAUSE_DURATION` is env-overridable, so a template could
 * raise it past any fixed number without failing loudly.
 */
export const AGENT_STALL_PAUSE_MARGIN_INTERVAL = THIRTY_SECONDS_INTERVAL;
