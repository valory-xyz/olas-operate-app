import { useQueries } from '@tanstack/react-query';
import { isNil } from 'lodash';
import { useContext, useMemo } from 'react';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { EvmChainId, FIVE_SECONDS_INTERVAL } from '@/constants';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { sumBigNumbers } from '@/utils/calculations';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { matchesAgentConfig } from '@/utils/service';

import { createActiveStakingProgramIdQuery } from './useActiveStakingProgramId';
import { createStakingRewardsQuery } from './useAgentStakingRewardsDetails';
import { useDynamicRefetchInterval } from './useDynamicRefetchInterval';
import { useServices } from './useServices';

/**
 * Hook to fetch staking rewards details of a service on a given chain.
 */
export const useStakingRewardsOf = (chainId: EvmChainId) => {
  const refetchInterval = useDynamicRefetchInterval(FIVE_SECONDS_INTERVAL);
  const { isOnline } = useContext(OnlineStatusContext);
  const {
    services,
    getServiceConfigIdsOf,
    isFetched: isServicesLoaded,
  } = useServices();

  const servicesOnChain = useMemo(
    () =>
      services?.filter(
        (s) =>
          s.home_chain === asMiddlewareChain(chainId) &&
          getServiceConfigIdsOf(chainId).includes(s.service_config_id),
      ),
    [services, chainId, getServiceConfigIdsOf],
  );

  const servicesDetails = useMemo(() => {
    return servicesOnChain
      ?.map((service) => {
        const agent = ACTIVE_AGENTS.find(([, agentConfig]) =>
          matchesAgentConfig(service, agentConfig),
        );
        // Skip unmatched services and no_staking agents (e.g. Connect) —
        // they have no staking rewards to fetch.
        if (
          !agent ||
          AGENT_CONFIG[agent[0]].defaultStakingProgramId === 'no_staking'
        ) {
          return null;
        }
        const agentType = agent[0];

        const chainConfigs = service.chain_configs;
        const chainDetails = isNil(chainConfigs)
          ? null
          : chainConfigs[asMiddlewareChain(chainId)]?.chain_data;
        const serviceNftTokenId = chainDetails?.token;
        return {
          agentConfig: AGENT_CONFIG[agentType],
          serviceNftTokenId,
          serviceConfigId: service.service_config_id,
          multisig: chainDetails?.multisig,
        };
      })
      .filter(
        (detail): detail is NonNullable<typeof detail> => detail !== null,
      );
  }, [chainId, servicesOnChain]);

  const activeStakingProgramIdQueries = useQueries({
    queries:
      servicesDetails?.map((serviceDetails) => {
        return createActiveStakingProgramIdQuery({
          evmHomeChainId: chainId,
          serviceNftTokenId: serviceDetails.serviceNftTokenId,
          serviceApi: serviceDetails.agentConfig.serviceApi,
          isServicesLoaded,
          refetchInterval,
        });
      }) ?? [],
  });

  const serviceDetailsWithStakingProgram = useMemo(() => {
    if (!servicesDetails || servicesDetails.length === 0) return [];

    return servicesDetails.map((serviceDetail, index) => {
      const queryResult = activeStakingProgramIdQueries[index];
      const activeStakingProgramId = queryResult?.data;
      const isLoading = queryResult?.isLoading ?? false;

      const selectedStakingProgramId = isLoading
        ? null
        : activeStakingProgramId ||
          serviceDetail.agentConfig.defaultStakingProgramId;

      return {
        chainId,
        selectedStakingProgramId,
        ...serviceDetail,
      };
    });
  }, [servicesDetails, activeStakingProgramIdQueries, chainId]);

  const servicesRewardsDetailsQueries = useQueries({
    queries: serviceDetailsWithStakingProgram.map((serviceDetail) => {
      return createStakingRewardsQuery({
        chainId,
        serviceNftTokenId: serviceDetail.serviceNftTokenId,
        stakingProgramId: serviceDetail.selectedStakingProgramId,
        agentConfig: serviceDetail.agentConfig,
        isOnline,
        serviceConfigId: serviceDetail.serviceConfigId,
        multisig: serviceDetail.multisig,
        refetchInterval,
      });
    }),
  });

  const isLoading = useMemo(() => {
    return servicesRewardsDetailsQueries.some((query) => query.isLoading);
  }, [servicesRewardsDetailsQueries]);

  const totalStakingRewards = useMemo(() => {
    return servicesRewardsDetailsQueries
      .filter((query) => query.isSuccess)
      .reduce((acc, query) => {
        const rewards = query.data;
        const accruedServiceStakingRewards =
          rewards?.accruedServiceStakingRewards ?? 0;
        return sumBigNumbers([acc, accruedServiceStakingRewards.toString()]);
      }, '0');
  }, [servicesRewardsDetailsQueries]);

  return { totalStakingRewards, isLoading };
};
