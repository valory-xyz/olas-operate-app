import { useEffect, useRef } from 'react';

import { MiddlewareDeploymentStatusMap } from '@/constants';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useServices } from '@/hooks/useServices';

const REWARD_MESSAGE =
  "Your agent earned its rewards! It's now idle and will resume working next epoch.";

/**
 * Hook to notify the user when the agent earns rewards and is idle.
 */
export const useNotifyOnAgentRewards = () => {
  const electronApi = useElectronApi();
  const { selectedService } = useServices();
  const { isEpochTargetMet } = useRewardContext();

  const prevIsEpochTargetMet = useRef<boolean>();

  // Notify the user when the agent earns rewards
  useEffect(() => {
    if (!electronApi.showNotification) return;

    // ignore if agent is not running
    if (
      selectedService?.deploymentStatus !==
      MiddlewareDeploymentStatusMap.DEPLOYED
    ) {
      return;
    }

    // ignore if eligibility is not yet defined
    if (isEpochTargetMet === undefined) return;

    // show notification when agent becomes eligible for rewards
    if (isEpochTargetMet === true && prevIsEpochTargetMet.current !== true) {
      electronApi.showNotification(REWARD_MESSAGE);
    }

    // Always update ref to track current state
    prevIsEpochTargetMet.current = isEpochTargetMet;
  }, [electronApi, isEpochTargetMet, selectedService?.deploymentStatus]);
};
