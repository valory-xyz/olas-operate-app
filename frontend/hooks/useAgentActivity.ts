import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
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
 */
const PROBE_DERIVED_DOWN_REASONS: readonly AgentLivenessReason[] = [
  'agent_process_exited',
  'agent_unresponsive',
];

/**
 * Services whose agent has answered `/healthcheck` with `is_healthy: false`
 * since their current start, mapped to `consecutive_failures` at that answer.
 *
 * `agent_reported_unhealthy` alone cannot keep the agent reachable: the
 * middleware overwrites `reason` on the next failed probe, which would turn an
 * agent that has answered back into a starting one. Module-level so every
 * reader of this hook, and a remount, sees the same answer.
 *
 * Cleared on the next start, seen either as a status other than DEPLOYED or as
 * `consecutive_failures` dropping below the stored count: each start drops the
 * middleware's liveness record, and within one record the count never falls
 * while `last_healthy_at` stays null.
 */
const failuresWhenAnswered = new Map<string, number>();

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
    // Not probe-derived: the middleware stopped the service itself because it
    // could not clear an on-chain eviction. Authoritative straight away.
    if (liveness.reason === 'evicted_cannot_restake') return true;
    if (!PROBE_DERIVED_DOWN_REASONS.includes(liveness.reason)) return false;
    return liveness.consecutive_failures >= MIN_FAILED_PROBES_TO_REPORT_DOWN;
  })();

  const isAgentActive = isServiceRunning && !isAgentDown;

  const serviceConfigId = selectedService?.service_config_id;
  if (serviceConfigId) {
    const answeredAt = failuresWhenAnswered.get(serviceConfigId);
    if (
      !isServiceRunning ||
      (liveness &&
        answeredAt !== undefined &&
        liveness.consecutive_failures < answeredAt)
    ) {
      failuresWhenAnswered.delete(serviceConfigId);
    }
    if (
      isServiceRunning &&
      liveness?.reason === 'agent_reported_unhealthy' &&
      !failuresWhenAnswered.has(serviceConfigId)
    ) {
      failuresWhenAnswered.set(serviceConfigId, liveness.consecutive_failures);
    }
  }
  const hasAnsweredSinceStart =
    !!serviceConfigId && failuresWhenAnswered.has(serviceConfigId);

  // Explicit null only, as a defensive guard: every middleware that sends
  // `agent_liveness` also sends `last_healthy_at`, so a missing key is not a
  // supported shape and counts as reachable, like a missing `agent_liveness`.
  // An agent that has reported itself unhealthy has answered, so its HTTP
  // server is up even though it has never been healthy since this start.
  const isAgentStarting =
    isAgentActive &&
    liveness?.last_healthy_at === null &&
    !hasAnsweredSinceStart;

  return {
    deploymentDetails,
    isServiceRunning,
    isServiceDeploying,
    /**
     * DEPLOYED *and* the agent process is not reported down.
     *
     * Kept separate from `isServiceRunning` because `Staking.tsx` uses that to
     * pick between "start the agent" and no alert: a dead-but-DEPLOYED agent
     * would make its card read "Start the agent" directly under a "Stop agent"
     * button. Only the activity strip should act on liveness.
     */
    isAgentActive,
    /** Active, but its HTTP server may not be up yet, so a chat message would fail. */
    isAgentStarting,
    isAgentReachable: isAgentActive && !isAgentStarting,
  };
};
