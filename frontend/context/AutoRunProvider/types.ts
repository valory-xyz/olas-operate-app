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
  enabled: boolean;
  includedAgents: IncludedAgent[];
  excludedAgents: AgentType[];
  currentAgent: AgentType | null;
  isToggling: boolean;
  eligibilityByAgent: Partial<Record<AgentType, Eligibility>>;
  setEnabled: (enabled: boolean) => void;
  includeAgent: (agentType: AgentType) => void;
  excludeAgent: (agentType: AgentType) => void;
};

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

export type GeoEligibilityResponse = {
  eligibility: {
    [key: string]: {
      status: 'allowed' | 'restricted';
    };
  };
};
