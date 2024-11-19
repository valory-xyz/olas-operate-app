import { useQueries } from '@tanstack/react-query';
import { isNil } from 'lodash';
import { useCallback, useContext } from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { StakingContractDetailsContext } from '@/context/StakingContractDetailsProvider';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Maybe } from '@/types/Util';

import { useChainId } from './useChainId';
import { useServices } from './useServices';

export const useStakingContractContext = () => {
  const {
    activeStakingContractDetails,
    isPaused,
    isAllStakingContractDetailsRecordLoaded,
    allStakingContractDetailsRecord,
    refetchActiveStakingContractDetails,
    setIsPaused,
    isActiveStakingContractDetailsLoaded,
  } = useContext(StakingContractDetailsContext);
  return {
    isActiveStakingContractDetailsLoaded,
    activeStakingContractDetails,
    isPaused,
    isAllStakingContractDetailsRecordLoaded,
    allStakingContractDetailsRecord,
    refetchActiveStakingContractDetails,
    setIsPaused,
  };
};

export const useActiveStakingContractInfo = () => {
  const {
    activeStakingContractDetails,
    isActiveStakingContractDetailsLoaded: isActiveStakingContractDetailsLoaded,
  } = useStakingContractContext();

  const { selectedService } = useServices();

  // TODO: find a better way to handle this, currently stops react lifecycle hooks being implemented below it
  if (!selectedService || !activeStakingContractDetails) {
    return {
      allStakingContractDetailsRecord,
      refetchActiveStakingContractDetails,
      setIsPaused,
      isPaused,
    };
  }

  const {
    serviceStakingState,
    serviceStakingStartTime,
    minimumStakingDuration,
    availableRewards,
    serviceIds,
    maxNumServices,
  } = activeStakingContractDetails ?? {};

  const isAgentEvicted = serviceStakingState === 2;

  const isServiceStaked =
    !!serviceStakingStartTime && serviceStakingState === 1;

  const isRewardsAvailable = availableRewards ?? 0 > 0;

  const hasEnoughServiceSlots =
    !isNil(serviceIds) &&
    !isNil(maxNumServices) &&
    serviceIds.length < maxNumServices;

  const hasEnoughRewardsAndSlots = isRewardsAvailable && hasEnoughServiceSlots;

  /**
   * Important: Assumes service is staked. Returns false for unstaked.
   * For example: minStakingDuration = 3 days
   *
   * - Service starts staking 1st June 00:01
   * - Service stops being active on 1st June 02:01 (after 2 hours)
   * - Contract will evict the service at 3rd June 02:02
   * - Now, cannot unstake the service until 4th June 00:01, because it hasn’t met the minStakingDuration of 3 days.
   * - IMPORTANT: Between 3rd June 02:02 and 4th June 00:01 the service is EVICTED and without the possibility of unstake and re-stake
   * - That is, user should not be able to run/start your agent if this condition is met.
   *
   */
  const isServiceStakedForMinimumDuration =
    !isNil(serviceStakingStartTime) &&
    !isNil(minimumStakingDuration) &&
    Math.round(Date.now() / 1000) - serviceStakingStartTime >=
      minimumStakingDuration;

  // Eviction expire time in seconds
  const evictionExpiresAt =
    (serviceStakingStartTime ?? 0) + (minimumStakingDuration ?? 0);

  const isEligibleForStaking =
    !isNil(hasEnoughRewardsAndSlots) &&
    (isAgentEvicted ? isServiceStakedForMinimumDuration : true);

  return {
    isAgentEvicted,
    isEligibleForStaking,
    isServiceStakedForMinimumDuration,
    isServiceStaked,
    evictionExpiresAt,
    isActiveStakingContractDetailsLoaded,
    activeStakingContractDetails,
  };
};

/**
 * hook to get staking contract details by staking program
 */
export const useStakingContractDetailsByStakingProgram = (
  serviceId: Maybe<number>,
  stakingProgramsId: StakingProgramId[],
  isPaused?: boolean,
) => {
  const chainId = useChainId();
  const { selectedAgentConfig } = useServices();
  const response = useQueries({
    queries: stakingProgramsId.map((programId) => ({
      queryKey:
        REACT_QUERY_KEYS.STAKING_CONTRACT_DETAILS_BY_STAKING_PROGRAM_KEY(
          chainId,
          serviceId!,
          programId,
        ),
      queryFn: async () => {
        return await selectedAgentConfig.serviceApi.getStakingContractDetailsByServiceIdStakingProgram(
          serviceId!,
          programId,
          chainId,
        );
      },
      enabled: !!serviceId && !!programId && !!chainId && !isPaused,
      refetchInterval: !isPaused ? FIVE_SECONDS_INTERVAL : () => false,
      refetchOnWindowFocus: false,
    })),
  });

  const isLoading = response.some((query) => query.isLoading);
  const data = response.map((query) => query.data);
  const refetch = useCallback(() => {
    response.forEach((query) => query.refetch());
  }, [response]);

  return { isLoading, data, refetch };
};

export const useStakingContractDetails = (
  stakingProgramId: StakingProgramId,
) => {
  const { allStakingContractDetailsRecord } = useStakingContractContext();
  const stakingContractInfo =
    allStakingContractDetailsRecord?.[stakingProgramId];

  const { serviceIds, maxNumServices, availableRewards } =
    stakingContractInfo ?? {};

  const isRewardsAvailable = availableRewards ?? 0 > 0;

  const hasEnoughServiceSlots =
    !isNil(serviceIds) &&
    !isNil(maxNumServices) &&
    serviceIds.length < maxNumServices;

  const hasEnoughRewardsAndSlots = isRewardsAvailable && hasEnoughServiceSlots;

  return {
    hasEnoughServiceSlots,
    isRewardsAvailable,
    stakingContractInfo,
    hasEnoughRewardsAndSlots,
  };
};
