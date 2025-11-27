import { useEffect, useState } from 'react';

import {
  useActiveStakingContractDetails,
  useIsInitiallyFunded,
  useService,
} from '@/hooks';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types';

const START_YOUR_AGENT_MESSAGE =
  'Start your agent to avoid missing rewards and getting evicted.';

type EpochStatusNotification = {
  lastEpoch: number;
  isNotified: boolean;
};

/**
 * Hook to notify the user when a new epoch is started
 * and agent is not running.
 *
 * Should also match the behavior of AgentDisabledAlert.
 */
export const useNotifyOnNewEpoch = () => {
  const { selectedAgentConfig } = useServices();
  const { showNotification } = useElectronApi();
  const { selectedService } = useServices();
  const { isEligibleForRewards } = useRewardContext();
  const { isInitialFunded } = useIsInitiallyFunded();
  const { isServiceRunning } = useService(selectedService?.service_config_id);
  const {
    selectedStakingContractDetails: activeStakingContractDetails,
    isSelectedStakingContractDetailsLoading,
    isAgentEvicted,
    isEligibleForStaking,
    hasEnoughServiceSlots,
    isServiceStaked,
  } = useActiveStakingContractDetails();
  const epoch = activeStakingContractDetails?.epochCounter;

  const [currentEpoch, setCurrentEpoch] = useState<Nullable<number>>(null);

  console.log('[useNotifyOnNewEpoch] render', {
    currentEpoch,
  });

  useEffect(() => {
    if (!showNotification) {
      console.log('[useNotifyOnNewEpoch] return 1');
      return;
    }

    // if agent config is under construction
    if (selectedAgentConfig.isUnderConstruction) {
      console.log('[useNotifyOnNewEpoch] return 2');
      return;
    }

    // if initial funding is not done
    // if (isInitialFunded === false) {
    //   console.log('[useNotifyOnNewEpoch] return 3');
    //   return;
    // }

    // if active staking contract info is still loading
    if (isSelectedStakingContractDetailsLoading) {
      console.log('[useNotifyOnNewEpoch] return 4');
      return;
    }

    if (
      !isSelectedStakingContractDetailsLoading &&
      isServiceStaked === false &&
      hasEnoughServiceSlots === false
    ) {
      console.log('[useNotifyOnNewEpoch] return 5');
      return;
    }

    // if agent is evicted or not eligible for staking, no need to notify
    if (isAgentEvicted && !isEligibleForStaking) {
      console.log('[useNotifyOnNewEpoch] return 6');
      return;
    }

    // if agent is running, no need to show notification
    if (isServiceRunning) {
      console.log('[useNotifyOnNewEpoch] return 7');
      return;
    }

    // if current epoch has already earned rewards
    if (isEligibleForRewards === true) {
      console.log('[useNotifyOnNewEpoch] return 8');
      return;
    }

    // latest epoch is not loaded yet
    if (!epoch) {
      console.log('[useNotifyOnNewEpoch] return 9');
      return;
    }

    // if latest epoch is not the last known epoch, notify once and update
    if (currentEpoch !== epoch) {
      showNotification(START_YOUR_AGENT_MESSAGE);
      setCurrentEpoch(epoch);
      console.log('[useNotifyOnNewEpoch] return 11');
      return;
    }
  }, [
    isSelectedStakingContractDetailsLoading,
    isServiceRunning,
    isAgentEvicted,
    isEligibleForStaking,
    currentEpoch,
    epoch,
    selectedAgentConfig.isUnderConstruction,
    isInitialFunded,
    hasEnoughServiceSlots,
    isServiceStaked,
    showNotification,
    isEligibleForRewards,
  ]);
};
