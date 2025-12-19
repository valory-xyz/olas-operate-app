import { useQueries } from '@tanstack/react-query';
import { isNil } from 'lodash';
import { useContext, useMemo } from 'react';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType, EvmChainId, FIVE_SECONDS_INTERVAL } from '@/constants';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { assertRequired } from '@/types/Util';
import { sumBigNumbers } from '@/utils/calculations';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

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
    return servicesOnChain?.map((service) => {
      const agent = ACTIVE_AGENTS.find(
        ([, agentConfig]) =>
          agentConfig.evmHomeChainId === chainId &&
          agentConfig.servicePublicId === service.service_public_id,
      );
      assertRequired(agent, 'Agent not found for the given service.');
      const agentType = agent[0] as AgentType;

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
    });
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
