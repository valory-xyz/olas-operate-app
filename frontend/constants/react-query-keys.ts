export const REACT_QUERY_KEYS = {
  SERVICES_KEY: ['services'] as const,
  SERVICE_DEPLOYMENT_STATUS_KEY: (serviceConfigId: string) =>
    ['serviceStatus', serviceConfigId] as const,
  REWARDS_KEY: (stakingProgramId: string, multisig: string, token: number) =>
    ['rewards', stakingProgramId, multisig, token] as const,
  AVAILABLE_REWARDS_FOR_EPOCH_KEY: (
    stakingProgramId: string,
    chainId: number,
  ) => ['availableRewardsForEpoch', stakingProgramId, chainId] as const,
} as const;
