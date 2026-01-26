export type PolystratPayoutData = {
  type: 'polystrat/payout';
  betId: string;
  question: string;
  transactionHash: string;
  position: string;
  amount_betted: string;
  payout: string;
};

// Discriminated union of all achievement data types
export type AchievementData = PolystratPayoutData;

export type Achievement = {
  achievement_id: string;
  acknowledgement_timestamp: number;
  acknowledged: boolean;
  data: AchievementData;
};

export type AchievementType = AchievementData['type'];

export type ServiceAchievements = Achievement[];

export type AllServicesAchievements = {
  [service_config_id: string]: ServiceAchievements;
};

export type AchievementWithConfig = Achievement & {
  serviceConfigId: string;
};
