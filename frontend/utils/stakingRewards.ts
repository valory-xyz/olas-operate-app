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
};

/**
 * Shared staking rewards fetcher used by React Query hooks and auto-run runtime.
 * Throws on RPC or validation errors so React Query retains previousData instead
 * of overwriting it with null on transient failures.
 */
export const fetchAgentStakingRewardsInfo = async ({
  chainId,
  stakingProgramId,
  multisig,
  serviceNftTokenId,
  agentConfig,
}: FetchAgentStakingRewardsInfoParams): Promise<StakingRewardsInfo | null> => {
  if (!stakingProgramId) return null;

  const response = await agentConfig.serviceApi.getAgentStakingRewardsInfo({
    agentMultisigAddress: multisig as Address,
    serviceId: serviceNftTokenId,
    stakingProgramId,
    chainId,
  });

  if (!response) return null;
  return StakingRewardsInfoSchema.parse(response);
};
