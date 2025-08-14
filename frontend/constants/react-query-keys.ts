import { Safe } from '@/enums/Wallet';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { Maybe } from '@/types/Util';

import { SupportedMiddlewareChain } from './chains';

export const REACT_QUERY_KEYS = {
  // services
  SERVICES_KEY: ['services'] as const,
  SERVICES_VALIDATION_STATUS_KEY: ['servicesValidationStatus'] as const,
  SERVICE_DEPLOYMENT_STATUS_KEY: (serviceConfigId: Maybe<string>) =>
    ['serviceStatus', serviceConfigId ?? ''] as const,

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
  STAKING_PROGRAM_KEY: (chainId: number, serviceConfigId: number = 0) =>
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
  ) =>
    [
      'availableRewardsForEpoch',
      currentChainId,
      serviceConfigId,
      stakingProgramId,
    ] as const,
  REWARDS_HISTORY_KEY: (chainId: number, serviceId: number) =>
    ['rewardsHistory', chainId, serviceId] as const,

  // multisigs
  MULTISIG_GET_OWNERS_KEY: (multisig: Safe) =>
    ['multisig', 'getOwners', multisig.evmChainId, multisig.address] as const,
  MULTISIGS_GET_OWNERS_KEY: (multisigs: Safe[]) =>
    [
      'multisigs',
      'getOwners',
      multisigs.map((multisig) => multisig.address),
    ] as const,

  // agent activity
  AGENT_ACTIVITY: ['agentActivity'] as const,

  // balances and funding requirements
  BALANCES_AND_REFILL_REQUIREMENTS_KEY: (serviceConfigId: string) =>
    ['balancesAndRefillRequirements', serviceConfigId] as const,

  // bridge
  BRIDGE_REFILL_REQUIREMENTS_KEY: (params: BridgeRefillRequirementsRequest) =>
    ['bridgeRefillRequirements', params] as const,
  BRIDGE_REFILL_REQUIREMENTS_KEY_ON_DEMAND: (
    params: BridgeRefillRequirementsRequest,
  ) => ['useBridgeRefillRequirementsOnDemand', params] as const,
  BRIDGE_STATUS_BY_QUOTE_ID_KEY: (quoteId: string) =>
    ['bridgeStatusByQuoteId', quoteId] as const,
  BRIDGE_EXECUTE_KEY: (quoteId: string) => ['bridgeExecute', quoteId] as const,

  // on ramp
  ON_RAMP_QUOTE_KEY: (
    chain: SupportedMiddlewareChain,
    amount: number | string,
  ) => ['onRampQuote', chain, amount] as const,
} as const;
