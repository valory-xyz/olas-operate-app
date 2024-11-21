import { isNil } from 'lodash';
import { useContext } from 'react';

import { StakingContractDetailsContext } from '@/context/StakingContractDetailsProvider';
import { StakingProgramId } from '@/enums/StakingProgram';
import { StakingState } from '@/types/Autonolas';

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

/**
 * Returns ACTIVE staking contract details
 * Has staked service speficic information that `useStakingContractDetails` does not have

 * @note requires serviceConfigId once multiple instances are supported
 */
export const useActiveStakingContractInfo = () => {
  const {
    activeStakingContractDetails,
    isActiveStakingContractDetailsLoaded: isActiveStakingContractDetailsLoaded,
    allStakingContractDetailsRecord,
    refetchActiveStakingContractDetails,
    isPaused,
    setIsPaused,
  } = useStakingContractContext();

  const { selectedService } = useServices();

  // TODO: find a better way to handle this, currently stops react lifecycle hooks being implemented below it
  if (!selectedService || !activeStakingContractDetails) {
    return {
      allStakingContractDetailsRecord,
      refetchActiveStakingContractDetails,
      isPaused,
      setIsPaused,
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

  const isAgentEvicted = serviceStakingState === StakingState.Evicted;

  const isServiceStaked =
    !!serviceStakingStartTime && serviceStakingState === StakingState.Staked;

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
    hasEnoughRewardsAndSlots,
    hasEnoughServiceSlots,
    isRewardsAvailable,
  };
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
