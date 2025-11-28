import { EvmChainId, EvmChainIdMap, StakingProgramId } from '@/constants';
import {
  Address,
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
} from '@/types';

import { AgentsFunService } from './shared-services/AgentsFun';

export abstract class AgentsFunBaseService extends AgentsFunService {
  static getAgentStakingRewardsInfo = async ({
    agentMultisigAddress,
    serviceId,
    stakingProgramId,
    chainId = EvmChainIdMap.Base,
  }: {
    agentMultisigAddress: Address;
    serviceId: number;
    stakingProgramId: StakingProgramId;
    chainId?: EvmChainId;
  }): Promise<StakingRewardsInfo | undefined> => {
    return await AgentsFunService.getAgentStakingRewardsInfo({
      agentMultisigAddress,
      serviceId,
      stakingProgramId,
      chainId,
    });
  };

  static getAvailableRewardsForEpoch = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Base,
  ): Promise<bigint | undefined> => {
    return await AgentsFunService.getAvailableRewardsForEpoch(
      stakingProgramId,
      chainId,
    );
  };

  static getServiceStakingDetails = async (
    serviceNftTokenId: number,
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Base,
  ): Promise<ServiceStakingDetails> => {
    return await AgentsFunService.getServiceStakingDetails(
      serviceNftTokenId,
      stakingProgramId,
      chainId,
    );
  };

  static getStakingContractDetails = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainIdMap.Base,
  ): Promise<StakingContractDetails | undefined> => {
    return await AgentsFunService.getStakingContractDetails(
      stakingProgramId,
      chainId,
    );
  };
}
