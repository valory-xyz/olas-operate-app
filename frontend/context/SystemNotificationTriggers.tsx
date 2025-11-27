import { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import { useInterval } from 'usehooks-ts';

import { MiddlewareDeploymentStatusMap } from '@/constants';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useServices } from '@/hooks/useServices';

const Notifications = {
  AgentEarned:
    "Your agent earned its rewards! It's now idle and will resume working next epoch.",
};

export const SystemNotificationTriggers = ({ children }: PropsWithChildren) => {
  const electronApi = useElectronApi();
  const { selectedService } = useServices();
  const { isEligibleForRewards } = useRewardContext();

  const prevIsEligibleForRewards = useRef<boolean>();

  // Notify the user when the agent earns rewards
  const handleAgentEarned = useCallback(() => {
    if (!electronApi.showNotification) return;

    // ignore if agent is not running
    if (
      selectedService?.deploymentStatus !==
      MiddlewareDeploymentStatusMap.DEPLOYED
    ) {
      return;
    }

    // ignore if eligibility is not yet defined
    if (isEligibleForRewards === undefined) return;

    // show notification when agent becomes eligible for rewards
    if (
      isEligibleForRewards === true &&
      prevIsEligibleForRewards.current !== true
    ) {
      electronApi.showNotification(Notifications.AgentEarned);
    }

    // Always update ref to track current state
    prevIsEligibleForRewards.current = isEligibleForRewards;
  }, [electronApi, isEligibleForRewards, selectedService?.deploymentStatus]);

  useEffect(() => {
    if (!electronApi.showNotification) return;

    // Show notification when agent earns rewards
    handleAgentEarned();
  }, [electronApi, handleAgentEarned, isEligibleForRewards]);

  useInterval(() => {
    if (!electronApi.showNotification) return;
    // electronApi.showNotification('Interval check running');
  }, 10000); // check every 15 seconds

  return children;
};
