import { useQueries } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '@/constants';

import { AgentMeta } from '../types';

export const useStakingContractQueries = (configuredAgents: AgentMeta[]) =>
  useQueries({
    queries: configuredAgents.map((meta) => ({
      queryKey: REACT_QUERY_KEYS.ALL_STAKING_CONTRACT_DETAILS(
        meta.chainId,
        meta.stakingProgramId,
      ),
      queryFn: async () =>
        meta.agentConfig.serviceApi.getStakingContractDetails(
          meta.stakingProgramId,
          meta.chainId,
        ),
      enabled: !!meta.stakingProgramId,
      staleTime: 1000 * 60 * 5,
    })),
  });
