import { AgentType } from '@/constants';

export type AgentInstance = {
  serviceConfigId: string;
  name: string;
  tokenId?: number;
  agentType: AgentType;
};
