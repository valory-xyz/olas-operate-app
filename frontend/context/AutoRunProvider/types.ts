import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, EvmChainId, StakingProgramId } from '@/constants';
import { Address, Service, ServiceConfigId } from '@/types';

export type IncludedAgent = {
  agentType: AgentType;
  order: number;
};

type Eligibility = {
  canRun: boolean;
  reason?: string;
  loadingReason?: string;
  isEligibleForRewards?: boolean;
};

export type AutoRunContextType = {
  /** Whether Auto-Run is enabled or not. */
  enabled: boolean;
  /** List of agents included in the Auto-Run set, with their order. */
  includedAgents: IncludedAgent[];
  /** List of agents excluded from the Auto-Run set. */
  excludedAgents: AgentType[];
  /** Whether the Auto-Run toggle is in the process of being changed. */
  isToggling: boolean;
  /** Eligibility information for each agent.
   * @example
   *  {
   *    [AgentMap..PredictTrader]: {
   *      canRun: false,
   *      reason: "Insufficient funds",
   *      isEligibleForRewards: true,
   *    },
   *    [AgentMap.Optimus]: {
   *      canRun: true,
   *      isEligibleForRewards: false,
   *    },
   *  }
   *
   */
  eligibilityByAgent: Partial<Record<AgentType, Eligibility>>;
  setEnabled: (enabled: boolean) => void;
  includeAgent: (agentType: AgentType) => void;
  excludeAgent: (agentType: AgentType) => void;
};

/**
 * Metadata about an agent
 */
export type AgentMeta = {
  agentType: AgentType;
  agentConfig: (typeof AGENT_CONFIG)[AgentType];
  service: Service;
  serviceConfigId: ServiceConfigId;
  chainId: EvmChainId;
  stakingProgramId: StakingProgramId;
  multisig?: Address;
  serviceNftTokenId?: number;
};
