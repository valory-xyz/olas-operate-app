import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';

import { DEFAULT_STAKING_PROGRAM_IDS } from '@/config/stakingPrograms';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { useServices } from '@/hooks/useServices';
import { AgentConfig } from '@/types/Agent';
import { Maybe } from '@/types/Util';

/**
 * hook to get the active staking program id
 */
export const useActiveStakingProgramId = (
  serviceNftTokenId: Maybe<number>,
  agentConfig: AgentConfig,
) => {
  const { isFetched: isServicesLoaded } = useServices();
  const { serviceApi, evmHomeChainId } = agentConfig;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(
      evmHomeChainId,
      serviceNftTokenId!,
    ),
    queryFn: async () => {
      if (!serviceNftTokenId) return null;
      if (!Number(serviceNftTokenId)) return null;

      const currentStakingProgramId =
        await serviceApi.getCurrentStakingProgramByServiceId(
          serviceNftTokenId,
          evmHomeChainId,
        );

      return (
        currentStakingProgramId ||
        DEFAULT_STAKING_PROGRAM_IDS[agentConfig.evmHomeChainId]
      );
    },
    enabled: !isNil(evmHomeChainId) && isServicesLoaded && !!serviceNftTokenId,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });
};
