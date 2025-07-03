export const EnvProvisionMap = {
  FIXED: 'fixed',
  USER: 'user',
  COMPUTED: 'computed',
} as const;

export type EnvProvision =
  (typeof EnvProvisionMap)[keyof typeof EnvProvisionMap];
