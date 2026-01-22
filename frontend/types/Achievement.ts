export type Achievement = {
  achievement_id: string;
  acknowledgement_timestamp: number;
  /**
   * Additional data fields for the achievement - depends on the achievement type
   */
  [achievement_data_field: string]: unknown;
};

export type ServiceAchievements = {
  [achievement_type: string]: Achievement;
};

export type AllServicesAchievements = {
  [service_config_id: string]: ServiceAchievements;
};

export type AchievementWithType = Achievement & {
  serviceConfigId: string;
  achievementType: string;
};
