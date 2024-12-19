import { AgentType } from '@/enums/Agent';

export type ElectronStore = {
  environmentName?: string;
  isInitialFunded_trader?: boolean;
  isInitialFunded_memeooorr?: boolean;
  isInitialFunded_modius?: boolean;
  firstStakingRewardAchieved?: boolean;
  firstRewardNotificationShown?: boolean;
  agentEvictionAlertShown?: boolean;
  lastSelectedAgentType?: AgentType;
};

export type ElectronTrayIconStatus =
  | 'low-gas'
  | 'running'
  | 'paused'
  | 'logged-out';
