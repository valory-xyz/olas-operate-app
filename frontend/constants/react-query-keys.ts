export const REACT_QUERY_KEYS = {
  // services
  SERVICES_KEY: ['services'] as const,
  SERVICE_DEPLOYMENT_STATUS_KEY: (serviceConfigId: string) =>
    ['serviceStatus', serviceConfigId] as const,

  // staking programs
  STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY: (
    serviceConfigId: string,
    activeStakingProgramId: string,
    chainId: number,
  ) =>
    [
      'stakingContractDetailsByStakingProgramId',
      serviceConfigId,
      activeStakingProgramId,
      chainId,
    ] as const,
  STAKING_PROGRAM_KEY: (serviceConfigId: string, chainId: number) =>
    ['stakingProgram', serviceConfigId, chainId] as const,

  // wallets
  WALLETS_KEY: ['wallets'] as const,

  // rewards
  REWARDS_KEY: (
    chainId: number,
    serviceUuid: string,
    stakingProgramId: string,
    multisig: string,
    token: number,
  ) =>
    [
      'rewards',
      chainId,
      serviceUuid,
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
} as const;
