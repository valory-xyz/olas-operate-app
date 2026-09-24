import { useMemo } from 'react';

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
 * `agent_reported_unhealthy` is deliberately **not** here and must not be added.
 * It means the agent answered the probe and reported itself unhealthy, so the
 * process is demonstrably up and serving HTTP — the one reason in the middleware's
 * vocabulary that establishes the agent is *not* down. It belongs to the stall
 * treatment below.
 */
const PROBE_DERIVED_DOWN_REASONS: readonly AgentLivenessReason[] = [
  'agent_process_exited',
  'agent_unresponsive',
];

/**
 * The middleware's own name for the condition this hook calls a stall: the agent
 * answered, and said it is not progressing.
 *
 * Read as a second route to the same verdict rather than a replacement for the
 * dwell rule, because it is available only on middleware that sends it and only
 * while a health-check job is running. Where it is available it is the stronger
 * signal, since it is the middleware's own conclusion from probes taken at its
 * fixed 5 s cadence rather than an inference from a field that may be stale.
 */
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
    // Not probe-derived: the middleware stopped the service itself because it
    // could not clear an on-chain eviction. Authoritative straight away.
    if (liveness.reason === 'evicted_cannot_restake') return true;
    if (!PROBE_DERIVED_DOWN_REASONS.includes(liveness.reason)) return false;
    return liveness.consecutive_failures >= MIN_FAILED_PROBES_TO_REPORT_DOWN;
  })();

  /**
   * DEPLOYED *and* the agent process is not reported down.
   *
   * Kept separate from `isServiceRunning` because `Staking.tsx` uses that to
   * pick between "start the agent" and no alert: a dead-but-DEPLOYED agent
   * would make its card read "Start the agent" directly under a "Stop agent"
   * button. Only the activity strip should act on liveness.
   */
  const isAgentActive = isServiceRunning && !isAgentDown;

  // A stalled agent is one that is alive and answering, but has not advanced
  // its FSM for longer than its own inter-cycle pause can explain. OPE-1941's
  // operator sat through two five-minute stalls with the strip still reporting
  // "Current action: ..." from a frozen round list.
  //
  // Keyed on dwell rather than on `is_healthy`, for two reasons. The agent
  // reports itself unhealthy during rounds whose events carry no timeout — a
  // trader defect, so `is_healthy: false` today means something different from
  // what it will mean once that lands. And "has not progressed for N seconds"
  // reads the same before and after. The individual fields are returned
  // alongside the verdict so a consumer can still tell a stall from a wedged
  // Tendermint, rather than being handed one opaque boolean.
  //
  // A pure function of the payload, deliberately: two surfaces are meant to
  // read this and they must never disagree with each other. Anything that
  // remembered a previous verdict would have to live in shared state to manage
  // that, and a per-hook-instance ref would let a strip mounted before a stall
  // and an alert mounted during one reach opposite conclusions from the same
  // payload.
  const healthcheck = deploymentDetails?.healthcheck;
  const dwellMs =
    (healthcheck?.seconds_since_last_transition ?? 0) * ONE_SECOND_INTERVAL;
  // The middleware rewrites `healthcheck.json` only on a probe that answered
  // HTTP 200, so `seconds_since_last_transition` is frozen for as long as the
  // agent is not answering at all — the shape OPE-1941 reported, where the
  // port accepted connections but `/healthcheck` never replied. Without this
  // the dwell can sit below the bar for the whole incident and the stall is
  // never seen; worse, a stale small number would keep the strip asserting
  // normal operation. Defaults to 0 because middleware older than 0.15.40
  // omits the field, and unknown age must not disable the derivation.
  const healthcheckAgeMs =
    (healthcheck?.age_seconds ?? 0) * ONE_SECOND_INTERVAL;
  const announceThresholdMs = Math.max(
    AGENT_STALL_ANNOUNCE_INTERVAL,
    (healthcheck?.reset_pause_duration ?? 0) * ONE_SECOND_INTERVAL +
      AGENT_STALL_PAUSE_MARGIN_INTERVAL,
  );

  // Judged against the same bar the dwell is: a reading older than the
  // announce threshold predates the window being judged, so it cannot
  // establish that the agent is failing to progress *now*.
  const isHealthcheckCurrent = healthcheckAgeMs <= announceThresholdMs;

  // Gated on `isServiceRunning`, deliberately not on `isAgentActive`. The
  // probe failures that make up a stall are the same ones that drive
  // `agent_liveness` towards `is_alive: false`: at the pinned middleware a
  // 200 answer carrying `is_healthy: false` is recorded as a failed probe just
  // like an unreachable port, so `isAgentDown` flips at ~150 s of continuous
  // stall. Gating on it would have left the verdict true for roughly the 30 s
  // between the two bars, and unreachable altogether for a service whose
  // `reset_pause_duration` pushes its threshold past 150 s. The genuinely
  // dead-agent case is excluded by `isHealthcheckCurrent` instead, which is
  // the honest discriminator: a dead agent stops rewriting the file, a stalled
  // one keeps rewriting it with a dwell that climbs.
  const isDwellPastTheBar =
    !!healthcheck && isHealthcheckCurrent && dwellMs > announceThresholdMs;

  // The middleware saying so, on the same evidence floor as any other
  // probe-derived reason: the reason flips on the *first* failed probe, and
  // announcing a stall five seconds into one would cry wolf on every transient
  // blip. At the middleware's 5 s period the floor lands ~150 s in, a little
  // later than the dwell rule's own bar — which is the right order, since this
  // route exists for the case where the dwell reading is frozen or absent
  // rather than to pre-empt it.
  const isAgentReportedNotProgressing =
    liveness?.reason === AGENT_NOT_PROGRESSING_REASON &&
    liveness.consecutive_failures >= MIN_FAILED_PROBES_TO_REPORT_DOWN;

  const isAgentStalled =
    isServiceRunning && (isDwellPastTheBar || isAgentReportedNotProgressing);

  // Memoised because it is the only non-primitive this hook returns that React
  // Query does not keep stable for us. A consumer putting a fresh object
  // literal in a dependency array gets a `useMemo` that never memoises, or an
  // effect that fires every render.
  const agentHealth = useMemo(
    () => ({
      isHealthy: healthcheck?.is_healthy,
      isTmHealthy: healthcheck?.is_tm_healthy,
      isTransitioningFast: healthcheck?.is_transitioning_fast,
      secondsSinceLastTransition: healthcheck?.seconds_since_last_transition,
      /** The bar `secondsSinceLastTransition` was measured against. */
      announceThresholdMs,
    }),
    [healthcheck, announceThresholdMs],
  );

  // A restart the middleware performed, not one the operator asked for. While it
  // runs the deployment still reports DEPLOYED with an empty `rounds` array,
  // which is indistinguishable from an agent that has not answered its first
  // probe yet — so the strip's fallback branch says "Agent is running" at the one
  // moment it certainly is not. The counter is what tells the two apart; it is
  // reset by a healthy probe, so it goes quiet on its own.
  const isAgentRedeploying =
    isServiceRunning && (liveness?.restarts_since_last_healthy ?? 0) > 0;

  return {
    deploymentDetails,
    isServiceRunning,
    isServiceDeploying,
    /**
     * The agent is alive but has stopped advancing its FSM.
     *
     * Read together with `agentHealth`, never on its own — see the constraint
     * recorded there.
     *
     * Independent of `isAgentActive`, so a consumer rendering both must order
     * them itself: "not running" is the stronger claim and takes precedence
     * where they disagree.
     */
    isAgentStalled,
    /**
     * The health fields `isAgentStalled` was derived from, so a consumer can
     * distinguish the cases a single boolean flattens — notably a stalled
     * agent (`isTmHealthy: true`) from a wedged one (`isTmHealthy: false`),
     * which want different things said about them.
     */
    agentHealth,
    isAgentActive,
    /**
     * The middleware is restarting the agent, and it has not reported healthy
     * since. Distinct from `isServiceDeploying`, which is the deployment status
     * of an operator-initiated start.
     */
    isAgentRedeploying,
  };
};
