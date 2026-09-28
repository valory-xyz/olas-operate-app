import { useEffect, useMemo } from 'react';

import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import {
  AGENT_STALL_ANNOUNCE_INTERVAL,
  AGENT_STALL_PAUSE_MARGIN_INTERVAL,
  ONE_SECOND_INTERVAL,
} from '@/constants/intervals';
import { AgentLivenessReason } from '@/types';

import { useServices } from './useServices';

/**
 * Failed probes before a probe-derived liveness reason is believed.
 *
 * `agent_liveness.is_alive` flips false on the *first* failed probe, but the
 * middleware's own health checker tolerates 60 consecutive failures (5 min at
 * its 5 s period) before it concludes the agent is gone — because brief
 * failures are routine. Two observed cases that are not a dead agent:
 *
 * - the agent answers HTTP 425 ("Too Early") while it is still starting, which
 *   `_probe_agent` counts as unhealthy like any non-200;
 * - the port is briefly unreachable between rounds.
 *
 * Without this floor either one renders "Agent is not running" underneath a
 * "Pause" button.
 *
 * 30 is half the health checker's own `NUMBER_OF_FAILS_DEFAULT` of 60 — an
 * anchor rather than a guess, and ~2.5 min at the 5 s period. Measured against
 * a real capture, the unhealthy windows of a *healthy* agent ran 35 s, 45 s and
 * 56 s (the last one ~12 consecutive failures), so a tighter floor reports a
 * starting agent as dead. It still beats the two hours of stale "Current
 * action" in OPE-1920 by two orders of magnitude, and lands well inside the
 * ~5 min the agent stays down in each crash-loop cycle.
 */
const MIN_FAILED_PROBES_TO_REPORT_DOWN = 30;

/**
 * Probe-derived reasons: subject to the failure floor above, because one bad
 * probe is not evidence of a dead agent.
 *
 * Never add `agent_reported_unhealthy` here: the agent answered the probe, so
 * it is up — that reason means "not progressing" and routes to the stall.
 */
const PROBE_DERIVED_DOWN_REASONS: readonly AgentLivenessReason[] = [
  'agent_process_exited',
  'agent_unresponsive',
];

/** Set by the middleware itself when it stops the service: no floor applies. */
const AUTHORITATIVE_DOWN_REASONS: readonly AgentLivenessReason[] = [
  'evicted_cannot_restake',
  'stopped_by_failfast',
];

const AGENT_NOT_PROGRESSING_REASON: AgentLivenessReason =
  'agent_reported_unhealthy';

export const useAgentActivity = () => {
  const { selectedService, deploymentDetails } = useServices();

  const isServiceRunning =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYED;

  const isServiceDeploying =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYING;

  // The deployment status is the middleware's record of the last transition it
  // performed, not a probe of the agent process: an agent that exited (e.g.
  // because its service was evicted on-chain) leaves the service DEPLOYED and
  // `healthcheck.rounds` frozen at the round it died in. Liveness is what tells
  // the two apart.
  //
  // Everything not positively established as down stays unknown, which keeps
  // today's behaviour: a missing `agent_liveness` (older middleware) and
  // `not_monitored` (no health-check record, and the PID probe's process-name
  // match missed) both mean "don't know", not "dead".
  const liveness = deploymentDetails?.agent_liveness;
  const isAgentDown = (() => {
    if (!liveness || liveness.is_alive || !liveness.reason) return false;
    if (AUTHORITATIVE_DOWN_REASONS.includes(liveness.reason)) return true;
    if (!PROBE_DERIVED_DOWN_REASONS.includes(liveness.reason)) return false;
    return liveness.consecutive_failures >= MIN_FAILED_PROBES_TO_REPORT_DOWN;
  })();

  /**
   * DEPLOYED *and* the agent process is not reported down.
   *
   * Kept separate from `isServiceRunning` because `Staking.tsx` uses that to
   * pick between "start the agent" and no alert: a dead-but-DEPLOYED agent
   * would make its card read "Start the agent" directly under a "Stop agent"
   * button. Only the activity surfaces should act on liveness.
   */
  const isAgentActive = isServiceRunning && !isAgentDown;

  const healthcheck = deploymentDetails?.healthcheck;
  const healthcheckError = healthcheck?.error;
  useEffect(() => {
    if (healthcheckError) {
      console.error('Agent healthcheck unreadable:', healthcheckError);
    }
  }, [healthcheckError]);

  const isHealthy = healthcheck?.is_healthy;
  const isTmHealthy = healthcheck?.is_tm_healthy;
  const isTransitioningFast = healthcheck?.is_transitioning_fast;
  const secondsSinceLastTransition = healthcheck?.seconds_since_last_transition;

  // Keyed on dwell, not `is_healthy`: before trader v0.40.12 `is_healthy` is
  // false in rounds without a timeout event, and since then it stays true well
  // past the announce bar, so it cannot mark a stall on either side.
  const dwellMs = (secondsSinceLastTransition ?? 0) * ONE_SECOND_INTERVAL;
  // The middleware rewrites `healthcheck.json` only on an HTTP 200 probe, so
  // an agent that stops answering freezes every field here — dwell included.
  // A missing age reads as fresh so its absence cannot disable the derivation.
  const healthcheckAgeMs =
    (healthcheck?.age_seconds ?? 0) * ONE_SECOND_INTERVAL;
  const announceThresholdMs = Math.max(
    AGENT_STALL_ANNOUNCE_INTERVAL,
    (healthcheck?.reset_pause_duration ?? 0) * ONE_SECOND_INTERVAL +
      AGENT_STALL_PAUSE_MARGIN_INTERVAL,
  );
  const isHealthcheckCurrent = healthcheckAgeMs <= announceThresholdMs;
  const isDwellPastTheBar =
    isHealthcheckCurrent && dwellMs > announceThresholdMs;

  // Trader computes `is_healthy = is_transitioning_fast or
  // waiting_for_a_mech_response`, so healthy-but-not-fast is a mech wait.
  // NOTE(OPE-1941): inferred from that formula, not a published field — a new
  // disjunct in `is_healthy` would widen this silently.
  const isAwaitingMechResponse =
    isHealthy === true && isTransitioningFast === false;

  // Not suppressed by a mech wait: the payload that suppressor reads can be
  // frozen, whereas this is the middleware seeing the agent answer unhealthy.
  const isAgentReportedNotProgressing =
    liveness?.reason === AGENT_NOT_PROGRESSING_REASON &&
    liveness.consecutive_failures >= MIN_FAILED_PROBES_TO_REPORT_DOWN;

  // Gated on `isAgentActive` so every consumer inherits the precedence: "not
  // running" is the stronger claim, and the strip and alert must not disagree.
  const isAgentStalled =
    isAgentActive &&
    ((isDwellPastTheBar && !isAwaitingMechResponse) ||
      isAgentReportedNotProgressing);

  // Keyed on scalars: `age_seconds` is recomputed on every request, so the
  // `healthcheck` object itself is new on every poll.
  const livenessReason = liveness?.reason;
  const consecutiveFailures = liveness?.consecutive_failures;
  const agentHealth = useMemo(
    () => ({
      isHealthy,
      isTmHealthy,
      isTransitioningFast,
      secondsSinceLastTransition,
      announceThresholdMs,
      livenessReason,
      consecutiveFailures,
    }),
    [
      isHealthy,
      isTmHealthy,
      isTransitioningFast,
      secondsSinceLastTransition,
      announceThresholdMs,
      livenessReason,
      consecutiveFailures,
    ],
  );

  // A middleware-forced restart leaves the service DEPLOYED with an empty
  // round list, exactly like a slow first poll; the counter tells them apart.
  const isAgentRedeploying =
    isAgentActive && (liveness?.restarts_since_last_healthy ?? 0) > 0;

  return {
    deploymentDetails,
    isServiceRunning,
    isServiceDeploying,
    /** The agent is up and answering but has stopped advancing its FSM. */
    isAgentStalled,
    /**
     * The inputs `isAgentStalled` was derived from, so a consumer can tell a
     * stalled agent (`isTmHealthy: true`) from a wedged one.
     */
    agentHealth,
    isAgentActive,
    /**
     * The middleware is restarting the agent, and it has not reported healthy
     * since. Distinct from `isServiceDeploying`, an operator-initiated start.
     */
    isAgentRedeploying,
  };
};
