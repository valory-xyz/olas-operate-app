import { useQueries } from '@tanstack/react-query';

import { FIVE_SECONDS_INTERVAL } from '@/constants';
import { createStakingRewardsQuery } from '@/hooks/useAgentStakingRewardsDetails';

import { AgentMeta } from '../types';

export const useRewardsQueries = (
  configuredAgents: AgentMeta[],
  isOnline: boolean,
) =>
  useQueries({
    queries: configuredAgents.map((meta) =>
      createStakingRewardsQuery({
        chainId: meta.chainId,
        serviceConfigId: meta.serviceConfigId,
        stakingProgramId: meta.stakingProgramId,
        multisig: meta.multisig,
        serviceNftTokenId: meta.serviceNftTokenId,
        agentConfig: meta.agentConfig,
        isOnline,
        refetchInterval: FIVE_SECONDS_INTERVAL,
      }),
    ),
  });
