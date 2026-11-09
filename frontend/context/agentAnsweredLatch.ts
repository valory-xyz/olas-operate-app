import { AgentLiveness } from '@/types';

/**
 * Whether a service's agent has answered `/healthcheck` with
 * `is_healthy: false` since its current start.
 *
 * `agent_reported_unhealthy` alone cannot say so for long: the middleware
 * overwrites `reason` on the next failed probe, which would turn an agent that
 * has answered back into a starting one. So the answer is remembered here,
 * module-level so every reader and a remount share it.
 */

type LivenessSnapshot = {
  isDeployed: boolean;
  liveness: AgentLiveness | undefined;
};

/** `consecutive_failures` at the answer, per service config id. */
const failuresWhenAnswered = new Map<string, number>();

/**
 * Whether the stored answer belongs to an earlier start.
 *
 * A user or API start or stop makes the middleware drop the liveness record,
 * so its count restarts at 0. While `last_healthy_at` stays null nothing
 * resets the count within one record, the health checker's forced restart
 * included, so a lower count means a new start.
 */
const isStale = (stored: number, { isDeployed, liveness }: LivenessSnapshot) =>
  !isDeployed || (!!liveness && liveness.consecutive_failures < stored);

/**
 * Record or clear one service's answer from a deployment poll.
 *
 * Fed with every service on every poll (`ServicesProvider`), so a start of a
 * service that is not selected, or not on screen, still clears it.
 */
export const observeAgentLiveness = (
  serviceConfigId: string,
  snapshot: LivenessSnapshot,
) => {
  const stored = failuresWhenAnswered.get(serviceConfigId);
  if (stored !== undefined && isStale(stored, snapshot)) {
    failuresWhenAnswered.delete(serviceConfigId);
  }

  const { isDeployed, liveness } = snapshot;
  if (
    isDeployed &&
    liveness?.reason === 'agent_reported_unhealthy' &&
    !failuresWhenAnswered.has(serviceConfigId)
  ) {
    failuresWhenAnswered.set(serviceConfigId, liveness.consecutive_failures);
  }
};

/**
 * Whether the agent has answered since this start, as of `snapshot`.
 *
 * Pure: reads the current answer as well as the stored one, so a render that
 * runs before the poll is observed is already correct.
 */
export const hasAnsweredSinceStart = (
  serviceConfigId: string,
  snapshot: LivenessSnapshot,
) => {
  if (!snapshot.isDeployed) return false;
  if (snapshot.liveness?.reason === 'agent_reported_unhealthy') return true;

  const stored = failuresWhenAnswered.get(serviceConfigId);
  return stored !== undefined && !isStale(stored, snapshot);
};
