import { isNil } from 'lodash';
import { useContext } from 'react';

import { StakingProgramId } from '@/constants';
import { StakingContractDetailsContext } from '@/context/StakingContractDetailsProvider';
import { StakingProgramContext } from '@/context/StakingProgramProvider';
import { Maybe, StakingState } from '@/types';
import { isNoStakingProgram } from '@/utils/stakingProgram';

export const useStakingContractContext = () =>
  useContext(StakingContractDetailsContext);

/**
 * Returns ACTIVE staking contract details
 * Has staked service specific information that `useStakingContractDetails` does not have

 * @note requires serviceConfigId once multiple instances are supported
 */
export const useActiveStakingContractDetails = () => {
  const {
    selectedStakingContractDetails,
    isSelectedStakingContractDetailsLoading,
    isSelectedStakingContractDetailsError,
    refetchSelectedStakingContractDetails,
  } = useStakingContractContext();
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const {
    serviceStakingState,
    serviceStakingStartTime,
    minimumStakingDuration,
    availableRewards,
    serviceIds,
    maxNumServices,
  } = selectedStakingContractDetails ?? {};

  const isAgentEvicted = serviceStakingState === StakingState.Evicted;

  const isServiceStaked =
    !!serviceStakingStartTime && serviceStakingState === StakingState.Staked;

  const isRewardsAvailable = (availableRewards ?? 0) > 0;

  const hasEnoughServiceSlots =
    isNil(serviceIds) || isNil(maxNumServices)
      ? null
      : serviceIds.length < maxNumServices;

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
  const isServiceStakedForMinimumDuration = (() => {
    if (
      isNil(selectedStakingProgramId) ||
      isNoStakingProgram(selectedStakingProgramId)
    ) {
      return true;
    }

    if (isNil(serviceStakingStartTime) || isNil(minimumStakingDuration)) {
      return false;
    }

    return (
      Math.round(Date.now() / 1000) - serviceStakingStartTime >=
      minimumStakingDuration
    );
  })();

  const isServiceInContract = isServiceStaked || isAgentEvicted;

  /** Loaded and present: a failed read must not pass for "unstaked". */
  const hasStakingDetails =
    !isSelectedStakingContractDetailsLoading &&
    !isNil(selectedStakingContractDetails);

  /** Known to be out of the contract, which a switch to another program needs. */
  const isServiceOutOfContract = hasStakingDetails && !isServiceInContract;

  /** Known to be in the contract and inside its minimum staking period: it can't be unstaked yet. */
  const isInMinimumStakingPeriod =
    hasStakingDetails &&
    isServiceInContract &&
    !isServiceStakedForMinimumDuration;

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
    isServiceInContract,
    isInMinimumStakingPeriod,
    hasStakingDetails,
    isServiceOutOfContract,
    isStakingDetailsError: isSelectedStakingContractDetailsError,
    refetchSelectedStakingContractDetails,
    evictionExpiresAt,
    isSelectedStakingContractDetailsLoading,
    selectedStakingContractDetails,
    hasEnoughRewardsAndSlots,
    hasEnoughServiceSlots,
    isRewardsAvailable,
  };
};

export const useStakingContractDetails = (
  stakingProgramId: Maybe<StakingProgramId>,
) => {
  const { allStakingContractDetailsRecord } = useStakingContractContext();
  const stakingContractInfo = stakingProgramId
    ? allStakingContractDetailsRecord?.[stakingProgramId]
    : null;

  const { serviceIds, maxNumServices, availableRewards } =
    stakingContractInfo ?? {};

  const isRewardsAvailable = (availableRewards ?? 0) > 0;

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
