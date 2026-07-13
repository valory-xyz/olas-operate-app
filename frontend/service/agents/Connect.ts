import { EvmChainId, EvmChainIdMap, StakingProgramId } from '@/constants';
import {
  Address,
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
} from '@/types';

import { StakedAgentService } from './shared-services/StakedAgentService';

/**
 * Connect agent service.
 *
 * Connect runs with `staking_program_id: 'no_staking'`, so none of the staking
 * methods below are ever invoked at runtime — the `'no_staking'` guards in
 * `StakingContractDetailsProvider` / `RewardProvider` short-circuit before the
 * call. They exist only to satisfy the `StakedAgentService` contract and the
 * `serviceApi` union in `AgentConfig`.
 *
 * @warning DO NOT STORE STATE IN THIS CLASS. It is a singleton shared across
 * the application.
 */
export abstract class ConnectService extends StakedAgentService {
  static getAgentStakingRewardsInfo = async (_args: {
    agentMultisigAddress: Address;
    serviceId: number;
    stakingProgramId: StakingProgramId;
    chainId?: EvmChainId;
  }): Promise<StakingRewardsInfo | undefined> => {
    // no_staking: Connect never stakes, so there are no rewards to report.
    return undefined;
  };

  static getAvailableRewardsForEpoch = async (
    _stakingProgramId: StakingProgramId,
    _chainId: EvmChainId = EvmChainIdMap.Gnosis,
  ): Promise<bigint | undefined> => {
    return undefined;
  };

  static getServiceStakingDetails = async (
    _serviceNftTokenId: number,
    _stakingProgramId: StakingProgramId,
    _chainId: EvmChainId = EvmChainIdMap.Gnosis,
  ): Promise<ServiceStakingDetails> => {
    // Never called for no_staking (query is disabled upstream).
    throw new Error('Connect agent does not support staking (no_staking).');
  };

  static getStakingContractDetails = async (
    _stakingProgramId: StakingProgramId,
    _chainId: EvmChainId = EvmChainIdMap.Gnosis,
  ): Promise<StakingContractDetails | undefined> => {
    return undefined;
  };
}
