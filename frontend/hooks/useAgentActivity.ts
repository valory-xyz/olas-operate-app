import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { AgentLivenessReason } from '@/types/Agent';

import { useServices } from './useServices';

/**
 * Liveness reasons that positively establish the agent process is down.
 *
 * `not_monitored` is excluded on purpose. The middleware falls back to a PID
 * probe when it holds no health-check record for a service, and that probe
 * matches on process names — a miss reports `not_monitored` for a perfectly
 * healthy agent. Rendering "Agent is not running" under a running agent is a
 * worse failure than leaving the strip as it is today, so unknown stays
 * unknown.
 */
const DEAD_AGENT_LIVENESS_REASONS: readonly AgentLivenessReason[] = [
  'agent_process_exited',
  'agent_unresponsive',
  'evicted_cannot_restake',
];

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
  // the two apart. A missing `agent_liveness` means an older middleware —
  // unknown, not dead — so it keeps today's behaviour.
  const liveness = deploymentDetails?.agent_liveness;
  const isAgentDown =
    !!liveness &&
    !liveness.is_alive &&
    !!liveness.reason &&
    DEAD_AGENT_LIVENESS_REASONS.includes(liveness.reason);

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
    isAgentActive: isServiceRunning && !isAgentDown,
  };
};
