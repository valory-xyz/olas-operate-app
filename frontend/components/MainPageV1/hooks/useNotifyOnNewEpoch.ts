import { useEffect, useState } from 'react';

import { useActiveStakingContractDetails, useService } from '@/hooks';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';

type EpochStatusNotification = {
  lastEpoch: number;
  isNotified: boolean;
};

/**
 * Hook to notify the user when a new epoch is started
 * and agent is not running.
 */
export const useNotifyOnNewEpoch = () => {
  const { showNotification } = useElectronApi();
  const { selectedService } = useServices();
  const { isServiceRunning } = useService(selectedService?.service_config_id);

  const {
    selectedStakingContractDetails: activeStakingContractDetails,
    isSelectedStakingContractDetailsLoading,
  } = useActiveStakingContractDetails();
  const epoch = activeStakingContractDetails?.epochCounter;

  const [epochStatusNotification, setEpochStatusNotification] =
    useState<EpochStatusNotification | null>(null);

  useEffect(() => {
    // if active staking contract info is still loading, return
    if (isSelectedStakingContractDetailsLoading) return;

    // if agent is running, no need to show notification
    if (isServiceRunning) return;

    // latest epoch is not loaded yet
    if (!epoch) return;

    // first time, just load the epoch status
    if (!epochStatusNotification) {
      setEpochStatusNotification({ lastEpoch: epoch, isNotified: false });
      return;
    }

    // already notified for this epoch
    if (epochStatusNotification.isNotified) return;

    // if latest epoch is not the last notified epoch
    if (epochStatusNotification.lastEpoch !== epoch) {
      showNotification?.(
        'Start your agent to avoid missing rewards and getting evicted.',
      );

      setEpochStatusNotification({ lastEpoch: epoch, isNotified: true });
    }
  }, [
    epochStatusNotification,
    epoch,
    isSelectedStakingContractDetailsLoading,
    showNotification,
    isServiceRunning,
  ]);
};
