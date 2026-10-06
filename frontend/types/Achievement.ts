import { ACHIEVEMENT_TYPE } from '@/constants';

type PredictionPayoutAchievementData = {
  id: string;
  prediction_side: string;
  bet_amount: number;
  status: string;
  net_profit: number;
  total_payout: number;
  created_at: string;
  settled_at: string;
  transaction_hash: string | null;
  market: {
    id: string;
    title: string;
    external_url: string;
  };
};

type BaseAchievement = {
  achievement_id: string;
  acknowledgement_timestamp: number;
  acknowledged: boolean;
  title: string;
  description: string;
  timestamp: number;
};

type PolystratPayoutAchievement = BaseAchievement & {
  achievement_type: typeof ACHIEVEMENT_TYPE.POLYSTRAT_PAYOUT;
  data: PredictionPayoutAchievementData;
};

type OmenstratPayoutAchievement = BaseAchievement & {
  achievement_type: typeof ACHIEVEMENT_TYPE.OMENSTRAT_PAYOUT;
  data: PredictionPayoutAchievementData;
};

// Discriminated union of all achievement types
export type Achievement =
  | PolystratPayoutAchievement
  | OmenstratPayoutAchievement;

export type ServiceAchievements = Achievement[];

export type AchievementWithConfig = Achievement & {
  serviceConfigId: string;
};
