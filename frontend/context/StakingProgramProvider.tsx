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
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';

export const INITIAL_DEFAULT_STAKING_PROGRAM_ID = StakingProgramId.Beta;

export const StakingProgramContext = createContext<{
  activeStakingProgramId?: StakingProgramId | null;
  defaultStakingProgramId: StakingProgramId;
}>({
  activeStakingProgramId: undefined,
  defaultStakingProgramId: INITIAL_DEFAULT_STAKING_PROGRAM_ID,
});

const currentAgent = AGENT_CONFIG.trader; // TODO: replace with dynamic agent selection
const currentChainId = GNOSIS_CHAIN_CONFIG.chainId; // TODO: replace with dynamic chain selection

const useGetActiveStakingProgramId = () => {
  const queryClient = useQueryClient();

  const { selectedService, isFetched: isLoaded } = useServices();
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : '';
  const { service } = useService({ serviceConfigId });

  // if no service nft, not staked
  const serviceId = service?.chain_configs[currentChainId].chain_data?.token;

  const response = useQuery({
    queryKey: [REACT_QUERY_KEYS.STAKING_PROGRAM_KEY, serviceId, currentChainId],
    queryFn: async () => {
      return currentAgent.serviceApi.getCurrentStakingProgramByServiceId(
        serviceId!,
        currentChainId,
      );
    },
    enabled: !!service,
    refetchInterval: isLoaded ? FIVE_SECONDS_INTERVAL : false,
  });

  const setActiveStakingProgramId = useCallback(
    (stakingProgramId: StakingProgramId | null) => {
      queryClient.setQueryData(
        [REACT_QUERY_KEYS.STAKING_PROGRAM_KEY, serviceId, currentChainId],
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
  const { data: activeStakingProgramId } = useGetActiveStakingProgramId();

  return (
    <StakingProgramContext.Provider
      value={{
        activeStakingProgramId,
        // TODO: we should not expose the default staking program id, discuss with Josh
        defaultStakingProgramId: INITIAL_DEFAULT_STAKING_PROGRAM_ID,
      }}
    >
      {children}
    </StakingProgramContext.Provider>
  );
};
