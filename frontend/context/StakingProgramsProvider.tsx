import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useCallback } from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useServiceId } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';

const INITIAL_DEFAULT_STAKING_PROGRAM_ID = StakingProgramId.PearlBeta;

export const StakingProgramsContext = createContext<{
  isActiveStakingProgramsLoaded: boolean;
  activeStakingProgramsId: StakingProgramId[];
}>({
  isActiveStakingProgramsLoaded: false,
  activeStakingProgramsId: [],
});

/**
 * hook to get the active staking program id
 */
const useGetActiveStakingProgramIds = () => {
  const queryClient = useQueryClient();
  const { selectedAgentConfig } = useServices();
  const serviceId = useServiceId();

  const { serviceApi, homeChainId } = selectedAgentConfig;

  const response = useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(homeChainId, serviceId!),
    queryFn: async () => {
      const response = await serviceApi.getCurrentStakingProgramsByServiceId(
        serviceId!,
        homeChainId,
      );
      return response?.length === 0
        ? [INITIAL_DEFAULT_STAKING_PROGRAM_ID]
        : response;
    },
    enabled: !!homeChainId && !!serviceId,
    refetchInterval: serviceId ? FIVE_SECONDS_INTERVAL : false,
  });

  const setActiveStakingProgramId = useCallback(
    (stakingProgramId: Nullable<StakingProgramId>) => {
      if (!serviceId) return;
      if (!stakingProgramId) return;

      // update the active staking program id in the cache
      queryClient.setQueryData(
        REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(homeChainId, serviceId),
        (oldData: Nullable<StakingProgramId[]>) => {
          return oldData ? [...oldData, stakingProgramId] : [stakingProgramId];
        },
      );
    },
    [queryClient, homeChainId, serviceId],
  );

  return { ...response, setActiveStakingProgramId };
};

/**
 * context provider responsible for determining the all active staking programs.
 * It does so by checking if the current service is staked, and if so, which staking program it is staked in.
 * It also provides a method to update the active staking program id in state.
 */
export const StakingProgramsProvider = ({ children }: PropsWithChildren) => {
  const {
    isLoading: isStakingProgramsLoading,
    data: activeStakingProgramsId = [],
  } = useGetActiveStakingProgramIds();

  return (
    <StakingProgramsContext.Provider
      value={{
        isActiveStakingProgramsLoaded:
          !isStakingProgramsLoading && !!activeStakingProgramsId,
        activeStakingProgramsId,
      }}
    >
      {children}
    </StakingProgramsContext.Provider>
  );
};
