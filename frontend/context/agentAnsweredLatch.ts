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

const isAnswer = ({ isDeployed, liveness }: LivenessSnapshot) =>
  isDeployed && liveness?.reason === 'agent_reported_unhealthy';

/**
 * Whether the stored answer belongs to an earlier start.
 *
 * A user or API start or stop makes the middleware drop the liveness record,
 * so its count restarts at 0. Within one record every probe after the answer
 * raises the count, the health checker's forced restart included, so a count
 * no higher than the stored one means a new start. An equal count that is
 * itself an answer is re-recorded by the caller.
 */
const isStale = (stored: number, { isDeployed, liveness }: LivenessSnapshot) =>
  !isDeployed || (!!liveness && liveness.consecutive_failures <= stored);

/** Record or clear one service's answer from a deployment poll. */
export const observeAgentLiveness = (
  serviceConfigId: string,
  snapshot: LivenessSnapshot,
) => {
  const stored = failuresWhenAnswered.get(serviceConfigId);
  if (stored !== undefined && isStale(stored, snapshot)) {
    failuresWhenAnswered.delete(serviceConfigId);
  }

  if (
    snapshot.liveness &&
    isAnswer(snapshot) &&
    !failuresWhenAnswered.has(serviceConfigId)
  ) {
    failuresWhenAnswered.set(
      serviceConfigId,
      snapshot.liveness.consecutive_failures,
    );
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
  if (isAnswer(snapshot)) return true;

  const stored = failuresWhenAnswered.get(serviceConfigId);
  return stored !== undefined && !isStale(stored, snapshot);
};
