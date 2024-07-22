export type ElectronStore = {
  environmentName?: string;
  isInitialFunded?: boolean;
  firstStakingRewardAchieved?: boolean;
  firstRewardNotificationShown?: boolean;
  canCheckForUpdates?: boolean;
};

export type ElectronTrayIconStatus = 'low-gas' | 'running' | 'paused';
