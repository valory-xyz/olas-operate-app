type BaseAchievement = {
  achievement_id: string;
  acknowledgement_timestamp: number;
};

export type PolystratPayoutData = BaseAchievement & {
  betId: string;
  question: string;
  transactionHash: string;
  position: string;
  amount_betted: string;
  payout: string;
};

export type AchievementTypeMap = {
  // TODO: Use the correct achievement type from BE
  'polystrat/payout': PolystratPayoutData;
};

export type AchievementType = keyof AchievementTypeMap;

export type ServiceAchievements = {
  [K in AchievementType]?: AchievementTypeMap[K];
};

export type AllServicesAchievements = {
  [service_config_id: string]: ServiceAchievements;
};

export type AchievementWithType<T extends AchievementType = AchievementType> =
  AchievementTypeMap[T] & {
    serviceConfigId: string;
    achievementType: T;
  };
