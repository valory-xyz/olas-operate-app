export const REACT_QUERY_KEYS = {
  // services
  SERVICES_KEY: ['services'] as const,
  SERVICE_DEPLOYMENT_STATUS_KEY: (serviceConfigId: string) =>
    ['serviceStatus', serviceConfigId] as const,

  // staking programs
  STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY: (
    chainId: number,
    serviceConfigId: string,
    activeStakingProgramId: string,
  ) =>
    [
      'stakingContractDetailsByStakingProgramId',
      chainId,
      serviceConfigId,
      activeStakingProgramId,
    ] as const,
  ALL_STAKING_CONTRACT_DETAILS: (chainId: number, programId: string) =>
    ['allStakingContractDetails', chainId, programId] as const,
  STAKING_PROGRAM_KEY: (chainId: number, serviceConfigId: string) =>
    ['stakingProgram', chainId, serviceConfigId] as const,

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
