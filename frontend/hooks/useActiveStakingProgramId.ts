import { isNil } from 'lodash';
import { useMemo } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { EvmChainId, REACT_QUERY_KEYS } from '@/constants';
import { Address } from '@/types/Address';
import { AgentConfig } from '@/types/Agent';
import { Maybe } from '@/types/Util';
import { isValidServiceId } from '@/utils';

import { useRewardsHistory } from './useRewardsHistory';

type CreateActiveStakingProgramIdQueryParams = {
  evmHomeChainId: EvmChainId;
  serviceNftTokenId: Maybe<number>;
  serviceApi: (typeof AGENT_CONFIG)[keyof typeof AGENT_CONFIG]['serviceApi'];
  isServicesLoaded: Maybe<boolean>;
  refetchInterval: number;
};

/**
 * Legacy query creator for multi-service scenarios (e.g., useStakingRewardsOf).
 * Uses on-chain multicall to determine active staking program.
 * For single service queries, prefer using useActiveStakingProgramId hook which uses subgraph data.
 */
export const createActiveStakingProgramIdQuery = ({
  evmHomeChainId,
  serviceNftTokenId,
  serviceApi,
  isServicesLoaded,
  refetchInterval,
}: CreateActiveStakingProgramIdQueryParams) => {
  return {
    queryKey: REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(
      evmHomeChainId,
      serviceNftTokenId!,
    ),
    queryFn: async () => {
      if (!isValidServiceId(serviceNftTokenId)) return null;

      const currentStakingProgramId =
        await serviceApi.getCurrentStakingProgramByServiceId(
          serviceNftTokenId,
          evmHomeChainId,
        );

      return currentStakingProgramId;
    },
    enabled:
      !isNil(evmHomeChainId) &&
      !!isServicesLoaded &&
      isValidServiceId(serviceNftTokenId),
    refetchInterval,
  };
};

/**
 * Hook to get the active staking program id from subgraph data.
 * If there is no active staking program, it returns null.
 *
 * This replaces the previous on-chain multicall approach with a more efficient
 * subgraph query that provides the latestStakingContract directly.
 */
export const useActiveStakingProgramId = (agentConfig: AgentConfig) => {
  const { serviceApi, evmHomeChainId } = agentConfig;
  const { recentStakingContractAddress, isFetched, isLoading, isError } =
    useRewardsHistory();

  // Convert contract address to staking program ID
  const stakingProgramId = useMemo(() => {
    if (!recentStakingContractAddress) return null;

    return serviceApi.getStakingProgramIdByAddress(
      evmHomeChainId,
      recentStakingContractAddress as Address,
    );
  }, [recentStakingContractAddress, serviceApi, evmHomeChainId]);

  return {
    data: stakingProgramId,
    isFetched,
    isLoading,
    isError,
  };
};
