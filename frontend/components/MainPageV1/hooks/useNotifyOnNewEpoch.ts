import { useEffect, useState } from 'react';

import {
  useActiveStakingContractDetails,
  useBalanceAndRefillRequirementsContext,
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
  const { showNotification } = useElectronApi();
  const { isEligibleForRewards } = useRewardContext();
  const { isInitialFunded } = useIsInitiallyFunded();
  const { selectedAgentConfig, selectedService } = useServices();
  const { isServiceRunning } = useService(selectedService?.service_config_id);
  const { canStartAgent, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
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
    useState<Nullable<EpochStatusNotification>>(null);

  useEffect(() => {
    if (!showNotification) return;

    // if active staking contract info is still loading
    if (isSelectedStakingContractDetailsLoading) return;

    // if agent config is under construction
    if (selectedAgentConfig.isUnderConstruction) return;

    // if initial funding is not done
    if (isInitialFunded === false) return;

    // if service is not staked and has no available slots
    if (isServiceStaked === false && hasEnoughServiceSlots === false) {
      return;
    }

    // if agent is evicted and not eligible for staking, no need to notify
    if (isAgentEvicted && !isEligibleForStaking) return;

    // if agent is running, no need to show notification
    if (isServiceRunning) return;

    // if current epoch has already earned rewards
    if (isEligibleForRewards === true) return;

    // If does not have enough balance or funding requirements to start agent
    if (isBalancesAndFundingRequirementsLoading || !canStartAgent) return;

    // latest epoch is not loaded yet
    if (!epoch) return;

    // if latest epoch is not the last known epoch
    if (epochStatusNotification?.lastEpoch !== epoch) {
      showNotification(START_YOUR_AGENT_MESSAGE);
      setEpochStatusNotification({ lastEpoch: epoch, isNotified: true });
    }
  }, [
    isSelectedStakingContractDetailsLoading,
    isServiceRunning,
    isAgentEvicted,
    isEligibleForStaking,
    isServiceStaked,
    isEligibleForRewards,
    isInitialFunded,
    hasEnoughServiceSlots,
    epochStatusNotification,
    epoch,
    selectedAgentConfig.isUnderConstruction,
    canStartAgent,
    isBalancesAndFundingRequirementsLoading,
    showNotification,
  ]);
};
