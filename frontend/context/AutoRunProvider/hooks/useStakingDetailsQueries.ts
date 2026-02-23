import { useQueries } from '@tanstack/react-query';

import { FIVE_SECONDS_INTERVAL } from '@/constants';

import { AgentMeta } from '../types';

export const useStakingDetailsQueries = (
  configuredAgents: AgentMeta[],
  isOnline: boolean,
) =>
  useQueries({
    queries: configuredAgents.map((meta) => ({
      queryKey: [
        'autorun',
        'serviceStakingDetails',
        meta.chainId,
        meta.serviceConfigId,
        meta.stakingProgramId,
      ] as const,
      queryFn: async () =>
        meta.agentConfig.serviceApi.getServiceStakingDetails(
          meta.serviceNftTokenId!,
          meta.stakingProgramId,
          meta.chainId,
        ),
      enabled:
        !!meta.serviceConfigId &&
        !!meta.stakingProgramId &&
        !!meta.serviceNftTokenId,
      refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    })),
  });
