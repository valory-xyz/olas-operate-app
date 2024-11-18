export const REACT_QUERY_KEYS = {
  // services
  SERVICES_KEY: ['services'] as const,
  SERVICE_DEPLOYMENT_STATUS_KEY: (serviceConfigId: string) =>
    ['serviceStatus', serviceConfigId] as const,

  // staking programs
  STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY: (
    chainId: number,
    serviceConfigId: number,
    activeStakingProgramId: string,
  ) =>
    [
      'stakingContractDetailsByStakingProgramId',
      chainId,
      serviceConfigId,
      activeStakingProgramId,
    ] as const,
  ALL_STAKING_CONTRACT_DETAILS: (chainId: number, stakingProgramId: string) =>
    ['allStakingContractDetails', chainId, stakingProgramId] as const,
  STAKING_PROGRAM_KEY: (chainId: number, serviceConfigId: number) =>
    ['stakingProgram', chainId, serviceConfigId] as const,

  // wallets
  WALLETS_KEY: ['wallets'] as const,

  // epoch
  LATEST_EPOCH_TIME_KEY: (chainId: number, stakingProgramId: string) =>
    ['latestEpochTime', chainId, stakingProgramId] as const,

  // rewards
  REWARDS_KEY: (
    chainId: number,
    serviceConfigId: string,
    stakingProgramId: string,
    multisig: string,
    token: number,
  ) =>
    [
      'rewards',
      chainId,
      serviceConfigId,
      stakingProgramId,
      multisig,
      token,
    ] as const,
  AVAILABLE_REWARDS_FOR_EPOCH_KEY: (
    currentChainId: number,
    serviceConfigId: string,
    stakingProgramId: string,
    chainId: number,
  ) =>
    [
      'availableRewardsForEpoch',
      currentChainId,
      serviceConfigId,
      stakingProgramId,
      chainId,
    ] as const,
  REWARDS_HISTORY_KEY: (chainId: number, serviceId: number) =>
    ['rewardsHistory', chainId, serviceId] as const,
} as const;