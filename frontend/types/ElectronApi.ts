export type ElectronStore = {
  isInitialFunded?: boolean;
  firstStakingRewardAchieved?: boolean;
  firstRewardNotificationShown?: boolean;
  agentEvictionAlertShown?: boolean;
  canCheckForUpdates?: boolean | null;
};

export type ElectronTrayIconStatus =
  | 'low-gas'
  | 'running'
  | 'paused'
  | 'logged-out';

/**
 * Utility type for applying types to ElectronAPI object's properties recursively.*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- this is a generic type, `any` is acceptable
export type RecursiveFunction<T> = T extends (...args: any[]) => any
  ? T
  : {
      [K in keyof T]: RecursiveFunction<T[K]>;
    };
