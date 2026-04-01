import { useQueries } from '@tanstack/react-query';
import { isNil } from 'lodash';
import { useContext, useMemo } from 'react';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { FIVE_SECONDS_INTERVAL } from '@/constants';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { StakingProgramContext } from '@/context/StakingProgramProvider';
import { isServiceOfAgent } from '@/utils/service';
import { asEvmChainId, asMiddlewareChain } from '@/utils/middlewareHelpers';

import { createStakingRewardsQuery } from './useAgentStakingRewardsDetails';
import { useDynamicRefetchInterval } from './useDynamicRefetchInterval';
import { useServices } from './useServices';

/**
 * Hook to fetch staking reward status for all visible (non-archived) agent
 * instances across all agent types and chains.
 *
 * Returns a Map from serviceConfigId to `boolean | undefined`:
 * - `true`  → instance has earned rewards this staking cycle
 * - `false` → instance has not earned rewards
 * - `undefined` → still loading or no staking program configured
 */
export const useAllInstancesRewardStatus = (): Map<
  string,
  boolean | undefined
> => {
  const refetchInterval = useDynamicRefetchInterval(FIVE_SECONDS_INTERVAL);
  const { isOnline } = useContext(OnlineStatusContext);
  const { stakingProgramIdByServiceConfigId } =
    useContext(StakingProgramContext);
  const { services } = useServices();

  const serviceDetails = useMemo(() => {
    if (!services) return [];

    return services.flatMap((service) => {
      const agentEntry = ACTIVE_AGENTS.find(([, config]) =>
        isServiceOfAgent(service, config),
      );
      if (!agentEntry) return [];

      const [agentType] = agentEntry;
      const agentConfig = AGENT_CONFIG[agentType];

      const chainId = asEvmChainId(service.home_chain);
      const chainDetails = isNil(service.chain_configs)
        ? null
        : service.chain_configs[asMiddlewareChain(chainId)]?.chain_data;

      return [
        {
          serviceConfigId: service.service_config_id,
          chainId,
          multisig: chainDetails?.multisig,
          serviceNftTokenId: chainDetails?.token,
          stakingProgramId:
            stakingProgramIdByServiceConfigId.get(
              service.service_config_id,
            ) ?? null,
          agentConfig,
        },
      ];
    });
  }, [services, stakingProgramIdByServiceConfigId]);

  const queryResults = useQueries({
    queries: serviceDetails.map((detail) =>
      createStakingRewardsQuery({
        chainId: detail.chainId,
        serviceConfigId: detail.serviceConfigId,
        stakingProgramId: detail.stakingProgramId,
        multisig: detail.multisig,
        serviceNftTokenId: detail.serviceNftTokenId,
        agentConfig: detail.agentConfig,
        isOnline,
        refetchInterval,
      }),
    ),
  });

  return useMemo(() => {
    const map = new Map<string, boolean | undefined>();
    serviceDetails.forEach((detail, index) => {
      const result = queryResults[index];
      if (!result) return;
      if (result.isSuccess && result.data !== null && result.data !== undefined) {
        map.set(detail.serviceConfigId, result.data.isEligibleForRewards);
      } else {
        map.set(detail.serviceConfigId, undefined);
      }
    });
    return map;
  }, [serviceDetails, queryResults]);
};
