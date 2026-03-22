import { AgentType } from '@/constants';

export type SidebarInstance = {
  name: string;
  serviceConfigId: string;
};

export type SidebarAgentGroup = {
  agentType: AgentType;
  instances: SidebarInstance[];
};
