import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useCallback } from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useAgent } from '@/hooks/useAgent';
import { useChainId } from '@/hooks/useChainId';
import { useServiceId } from '@/hooks/useService';
import { Nullable } from '@/types/Util';

export const INITIAL_DEFAULT_STAKING_PROGRAM_ID = StakingProgramId.PearlBeta;

export const StakingProgramsContext = createContext<{
  isActiveStakingProgramsLoaded: boolean;
  activeStakingProgramIds?: StakingProgramId[];
}>({
  isActiveStakingProgramsLoaded: false,
  activeStakingProgramIds: [],
});

/**
 * hook to get the active staking program id
 */
const useGetActiveStakingProgramIds = () => {
  const queryClient = useQueryClient();
  const agent = useAgent();
  const chainId = useChainId();
  const serviceId = useServiceId();

  const response = useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(chainId, serviceId!),
    queryFn: async () => {
      const response =
        await agent.serviceApi.getCurrentStakingProgramsByServiceId(
          serviceId!,
          chainId,
        );
      return response?.length === 0
        ? [INITIAL_DEFAULT_STAKING_PROGRAM_ID]
        : response;
    },
    enabled: !!chainId && !!serviceId,
    refetchInterval: serviceId ? FIVE_SECONDS_INTERVAL : false,
  });

  const setActiveStakingProgramId = useCallback(
    (stakingProgramId: Nullable<StakingProgramId>) => {
      if (!serviceId) return;
      if (!stakingProgramId) return;

      // update the active staking program id in the cache
      queryClient.setQueryData(
        REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(chainId, serviceId),
        (oldData: Nullable<StakingProgramId[]>) => {
          return oldData ? [...oldData, stakingProgramId] : [stakingProgramId];
        },
      );
    },
    [queryClient, chainId, serviceId],
  );

  return { ...response, setActiveStakingProgramId };
};

/**
 * context provider responsible for determining the all active staking programs.
 * It does so by checking if the current service is staked, and if so, which staking program it is staked in.
 * It also provides a method to update the active staking program id in state.
 */
export const StakingProgramsProvider = ({ children }: PropsWithChildren) => {
  const { isLoading: isStakingProgramsLoading, data: activeStakingProgramIds } =
    useGetActiveStakingProgramIds();

  return (
    <StakingProgramsContext.Provider
      value={{
        isActiveStakingProgramsLoaded:
          !isStakingProgramsLoading && !!activeStakingProgramIds,
        activeStakingProgramIds,
      }}
    >
      {children}
    </StakingProgramsContext.Provider>
  );
};
