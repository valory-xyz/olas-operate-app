export const SettingsScreenMap = {
  Main: 'Main',
} as const;

export type SettingsScreen = keyof typeof SettingsScreenMap;
