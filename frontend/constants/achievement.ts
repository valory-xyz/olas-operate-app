export const ACHIEVEMENT_AGENT = {
  POLYSTRAT: 'polystrat',
  OMENSTRAT: 'omenstrat',
} as const;

export type AchievementAgent =
  (typeof ACHIEVEMENT_AGENT)[keyof typeof ACHIEVEMENT_AGENT];

export const ACHIEVEMENT_TYPE = {
  POLYSTRAT_PAYOUT: 'polystrat/payout',
} as const;
