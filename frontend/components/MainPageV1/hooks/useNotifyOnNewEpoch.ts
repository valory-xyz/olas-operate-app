import { useEffect, useState } from 'react';

import {
  useActiveStakingContractDetails,
  useIsInitiallyFunded,
  useService,
} from '@/hooks';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useServices } from '@/hooks/useServices';

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

  const [epochStatusNotification, setEpochStatusNotification] =
    useState<EpochStatusNotification | null>(null);

  useEffect(() => {
    if (!showNotification) return;

    // if agent config is under construction
    if (selectedAgentConfig.isUnderConstruction) return;

    // if initial funding is not done
    if (isInitialFunded === false) return;

    // if active staking contract info is still loading
    if (isSelectedStakingContractDetailsLoading) return;

    if (
      !isSelectedStakingContractDetailsLoading &&
      isServiceStaked === false &&
      hasEnoughServiceSlots === false
    ) {
      return;
    }

    // if agent is evicted or not eligible for staking, no need to notify
    if (isAgentEvicted && !isEligibleForStaking) return;

    // if agent is running, no need to show notification
    if (isServiceRunning) return;

    // if current epoch has already earned rewards
    if (isEligibleForRewards === true) return;

    // latest epoch is not loaded yet
    if (!epoch) return;

    // first time, just load the epoch status
    if (!epochStatusNotification) {
      setEpochStatusNotification({ lastEpoch: epoch, isNotified: false });
      return;
    }

    // if latest epoch is not the last known epoch, notify once and update
    if (epochStatusNotification.lastEpoch !== epoch) {
      showNotification(START_YOUR_AGENT_MESSAGE);
      setEpochStatusNotification({ lastEpoch: epoch, isNotified: true });
      return;
    }
  }, [
    isSelectedStakingContractDetailsLoading,
    isServiceRunning,
    isAgentEvicted,
    isEligibleForStaking,
    epochStatusNotification,
    epoch,
    selectedAgentConfig.isUnderConstruction,
    isInitialFunded,
    hasEnoughServiceSlots,
    isServiceStaked,
    showNotification,
    isEligibleForRewards,
  ]);
};
