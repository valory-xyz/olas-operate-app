import { EvmChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';
import {
  ServiceStakingDetails,
  StakingContractDetails,
  StakingRewardsInfo,
} from '@/types/Autonolas';

import { AgentsFunService } from './shared-services/AgentsFun';

export abstract class AgentsFunBaseService extends AgentsFunService {
  static getAgentStakingRewardsInfo = async ({
    agentMultisigAddress,
    serviceId,
    stakingProgramId,
    chainId = EvmChainId.Base,
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
    chainId: EvmChainId = EvmChainId.Base,
  ): Promise<bigint | undefined> => {
    return await AgentsFunService.getAvailableRewardsForEpoch(
      stakingProgramId,
      chainId,
    );
  };

  static getServiceStakingDetails = async (
    serviceNftTokenId: number,
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainId.Base,
  ): Promise<ServiceStakingDetails> => {
    return await AgentsFunService.getServiceStakingDetails(
      serviceNftTokenId,
      stakingProgramId,
      chainId,
    );
  };

  static getStakingContractDetails = async (
    stakingProgramId: StakingProgramId,
    chainId: EvmChainId = EvmChainId.Base,
  ): Promise<StakingContractDetails | undefined> => {
    return await AgentsFunService.getStakingContractDetails(
      stakingProgramId,
      chainId,
    );
  };
}
