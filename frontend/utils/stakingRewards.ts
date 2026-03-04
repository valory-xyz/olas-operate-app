import { EvmChainId, StakingProgramId } from '@/constants';
import { Address, Nullable } from '@/types';
import { AgentConfig } from '@/types/Agent';
import {
  StakingRewardsInfo,
  StakingRewardsInfoSchema,
} from '@/types/Autonolas';

type FetchAgentStakingRewardsInfoParams = {
  chainId: EvmChainId;
  stakingProgramId: Nullable<StakingProgramId>;
  multisig: string;
  serviceNftTokenId: number;
  agentConfig: AgentConfig;
  onError?: (error: unknown) => void;
};

/**
 * Shared staking rewards fetcher used by React Query hooks and auto-run runtime.
 */
export const fetchAgentStakingRewardsInfo = async ({
  chainId,
  stakingProgramId,
  multisig,
  serviceNftTokenId,
  agentConfig,
  onError,
}: FetchAgentStakingRewardsInfoParams): Promise<StakingRewardsInfo | null> => {
  if (!stakingProgramId) return null;

  try {
    const response = await agentConfig.serviceApi.getAgentStakingRewardsInfo({
      agentMultisigAddress: multisig as Address,
      serviceId: serviceNftTokenId,
      stakingProgramId,
      chainId,
    });

    if (!response) return null;
    return StakingRewardsInfoSchema.parse(response);
  } catch (error) {
    onError?.(error);
    return null;
  }
};
