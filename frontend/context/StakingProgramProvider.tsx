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

export const StakingProgramContext = createContext<{
  isActiveStakingProgramLoaded: boolean;
  activeStakingProgramId?: Nullable<StakingProgramId>;
}>({
  isActiveStakingProgramLoaded: false,
  activeStakingProgramId: null,
});

/**
 * hook to get the active staking program id
 */
const useGetActiveStakingProgramId = () => {
  const queryClient = useQueryClient();
  const agent = useAgent();
  const chainId = useChainId();
  const serviceId = useServiceId();

  const response = useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(chainId, serviceId!),
    queryFn: async () => {
      const response =
        await agent.serviceApi.getCurrentStakingProgramByServiceId(
          serviceId!,
          chainId,
        );
      return response?.length === 0
        ? INITIAL_DEFAULT_STAKING_PROGRAM_ID
        : response;
    },
    enabled: !!chainId && !!serviceId,
    refetchInterval: serviceId ? FIVE_SECONDS_INTERVAL : false,
  });

  const setActiveStakingProgramId = useCallback(
    (stakingProgramId: Nullable<StakingProgramId>) => {
      if (!serviceId) return;

      queryClient.setQueryData(
        REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(chainId, serviceId),
        stakingProgramId,
      );
    },
    [queryClient, chainId, serviceId],
  );

  return { ...response, setActiveStakingProgramId };
};

/**
 * context provider responsible for determining the current active staking program, if any.
 * It does so by checking if the current service is staked, and if so, which staking program it is staked in.
 * It also provides a method to update the active staking program id in state.
 */
export const StakingProgramProvider = ({ children }: PropsWithChildren) => {
  const { isLoading: isStakingProgramLoading, data: activeStakingProgramId } =
    useGetActiveStakingProgramId();

  return (
    <StakingProgramContext.Provider
      value={{
        isActiveStakingProgramLoaded:
          !isStakingProgramLoading && !!activeStakingProgramId,
        activeStakingProgramId,
      }}
    >
      {children}
    </StakingProgramContext.Provider>
  );
};
