export type PolystratAchievementData = {
  id: string;
  prediction_side: string;
  bet_amount: number;
  status: string;
  net_profit: number;
  created_at: string;
  settled_at: string;
  transactionHash: string;
  market: {
    id: string;
    title: string;
    external_url: string;
  };
};

export type BaseAchievement = {
  achievement_id: string;
  acknowledgement_timestamp: number;
  acknowledged: boolean;
  title: string;
  description: string;
  timestamp: number;
};

export type PolystratPayoutAchievement = BaseAchievement & {
  achievement_type: 'polystrat/payout';
  data: PolystratAchievementData;
};

// Discriminated union of all achievement types
export type Achievement = PolystratPayoutAchievement;

export type AchievementType = Achievement['achievement_type'];

export type ServiceAchievements = Achievement[];

export type AllServicesAchievements = {
  [service_config_id: string]: ServiceAchievements;
};

export type AchievementWithConfig = Achievement & {
  serviceConfigId: string;
};
