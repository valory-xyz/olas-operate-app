import { AgentType } from '@/constants';

export type SidebarInstance = {
  name: string;
  serviceConfigId: string;
  hasEarnedRewards?: boolean;
};

export type SidebarAgentGroup = {
  agentType: AgentType;
  instances: SidebarInstance[];
};
