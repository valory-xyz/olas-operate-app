/**
 * This context provider is responsible for determining the current active staking program, if any.
 * It does so by checking if the current service is staked, and if so, which staking program it is staked in.
 * It also provides a method to update the active staking program id in state.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useCallback } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { GNOSIS_CHAIN_CONFIG } from '@/config/chains';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingProgramId } from '@/enums/StakingProgram';
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

const currentAgent = AGENT_CONFIG.trader; // TODO: replace with dynamic agent selection
const currentChainId = GNOSIS_CHAIN_CONFIG.chainId; // TODO: replace with dynamic chain selection

/**
 * hook to get the active staking program id
 */
const useGetActiveStakingProgramId = () => {
  const queryClient = useQueryClient();
  const serviceId = useServiceId();

  const response = useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(currentChainId, serviceId!),
    queryFn: async () => {
      const response =
        await currentAgent.serviceApi.getCurrentStakingProgramByServiceId(
          serviceId!,
          currentChainId,
        );
      return response ?? INITIAL_DEFAULT_STAKING_PROGRAM_ID;
    },
    enabled: !!serviceId,
    refetchInterval: serviceId ? FIVE_SECONDS_INTERVAL : false,
  });

  const setActiveStakingProgramId = useCallback(
    (stakingProgramId: Nullable<StakingProgramId>) => {
      if (!serviceId) return;

      queryClient.setQueryData(
        REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(currentChainId, serviceId),
        stakingProgramId,
      );
    },
    [queryClient, serviceId],
  );

  return { ...response, setActiveStakingProgramId };
};

/**
 * Determines the current active staking program, if any
 * */
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
