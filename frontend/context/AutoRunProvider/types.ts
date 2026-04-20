import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, EvmChainId, StakingProgramId } from '@/constants';
import { Address, Service, ServiceConfigId } from '@/types';

/**
 * Legacy auto-run inclusion entry, keyed by AgentType.
 * @deprecated Use `IncludedAgentInstance` instead. Kept for one-time migration
 */
export type IncludedAgent = {
  agentType: AgentType;
  order: number;
};

/**
 * Auto-run inclusion entry, keyed by serviceConfigId.
 * Each entry represents a single service instance in the rotation queue,
 * with `order` determining the rotation sequence.
 */
export type IncludedAgentInstance = {
  serviceConfigId: string;
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
  /** List of instances included in the Auto-Run set, with their order. */
  includedInstances: IncludedAgentInstance[];
  /** List of instances excluded from the Auto-Run set. */
  excludedInstances: string[];
  /** Whether the Auto-Run toggle is in the process of being changed. */
  isToggling: boolean;
  /**
   * Eligibility information for each instance, keyed by serviceConfigId.
   * @example
   *  {
   *    "sc-aa001122-bb33-cc44-dd55-eeff66778899": {
   *      canRun: false,
   *      reason: "Insufficient funds",
   *      isEligibleForRewards: true,
   *    },
   *    "sc-11223344-5566-7788-99aa-bbccddeeff00": {
   *      canRun: true,
   *      isEligibleForRewards: false,
   *    },
   *  }
   */
  eligibilityByInstance: Partial<Record<string, Eligibility>>;
  setEnabled: (enabled: boolean) => void;
  includeInstance: (serviceConfigId: string) => void;
  excludeInstance: (serviceConfigId: string) => void;
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
