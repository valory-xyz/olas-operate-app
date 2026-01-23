type BaseAchievement = {
  achievement_id: string;
  acknowledgement_timestamp: number;
  acknowledged: boolean;
};

export type PolystratPayoutData = BaseAchievement & {
  type: 'polystrat/payout';
  betId: string;
  question: string;
  transactionHash: string;
  position: string;
  amount_betted: string;
  payout: string;
};

// Discriminated union of all achievement objects
export type Achievement = PolystratPayoutData;

export type AchievementType = Achievement['type'];

export type ServiceAchievements = Achievement[];

export type AllServicesAchievements = {
  [service_config_id: string]: ServiceAchievements;
};

export type AchievementWithConfig = Achievement & {
  serviceConfigId: string;
};
