import { isNil } from 'lodash';
import { useMemo } from 'react';

import { useAgentRunning } from '@/hooks/useAgentRunning';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useIsAgentGeoRestricted } from '@/hooks/useIsAgentGeoRestricted';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { useServices } from '@/hooks/useServices';
import { useSharedContext } from '@/hooks/useSharedContext';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';

type DeployabilityResult = {
  isLoading: boolean;
  canRun: boolean;
  reason?: string;
  loadingReason?: string;
};

/**
 * Hook to determine if the currently selected agent is deployable,
 * and if not, why not. Checks a variety of conditions that could prevent deployment, such as:
 * - Offline status
 * - Loading states of various services
 * - Geo-restrictions
 * - Another agent running
 * - Service slot availability
 * - Staking eligibility
 */
export const useDeployability = ({
  safeEligibility,
}: {
  safeEligibility?: { ok: boolean; reason?: string; isLoading?: boolean };
} = {}): DeployabilityResult => {
  const {
    selectedAgentConfig,
    selectedAgentType,
    isLoading: isServicesLoading,
  } = useServices();
  const { isOnline } = useOnlineStatusContext();
  const { isAnotherAgentRunning } = useAgentRunning();
  const {
    canStartAgent,
    isBalancesAndFundingRequirementsLoading,
    isBalancesAndFundingRequirementsReady,
  } = useBalanceAndRefillRequirementsContext();
  const { isAgentsFunFieldUpdateRequired } = useSharedContext();
  const {
    isAgentEvicted,
    isEligibleForStaking,
    isServiceStaked,
    hasEnoughServiceSlots,
    isSelectedStakingContractDetailsLoading,
  } = useActiveStakingContractDetails();

  const { isAgentGeoRestricted, isGeoLoading } = useIsAgentGeoRestricted({
    agentType: selectedAgentType,
    agentConfig: selectedAgentConfig,
  });

  const loadingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!isOnline) reasons.push('Offline');
    if (isServicesLoading) reasons.push('Services');
    if (
      isBalancesAndFundingRequirementsLoading ||
      !isBalancesAndFundingRequirementsReady
    ) {
      reasons.push('Balances');
    }
    if (isSelectedStakingContractDetailsLoading) reasons.push('Staking');
    if (isGeoLoading) reasons.push('Geo');
    if (safeEligibility?.isLoading) reasons.push('Safe');
    return reasons;
  }, [
    isBalancesAndFundingRequirementsLoading,
    isBalancesAndFundingRequirementsReady,
    isGeoLoading,
    isOnline,
    isSelectedStakingContractDetailsLoading,
    isServicesLoading,
    safeEligibility?.isLoading,
  ]);
  const isLoading = loadingReasons.length > 0;
  const loadingReason =
    loadingReasons.length > 0 ? loadingReasons.join(', ') : undefined;

  return useMemo(() => {
    if (safeEligibility && !safeEligibility.ok) {
      return {
        isLoading,
        canRun: false,
        reason: safeEligibility.reason,
        loadingReason,
      };
    }

    if (isLoading) {
      return { isLoading, canRun: false, reason: 'Loading', loadingReason };
    }

    // If service is under construction, return false
    if (selectedAgentConfig.isUnderConstruction) {
      return { isLoading, canRun: false, reason: 'Under construction' };
    }

    // If agent is geo-restricted in the current region
    const isGeoRestricted =
      selectedAgentConfig.isGeoLocationRestricted && isAgentGeoRestricted;
    if (isGeoRestricted) {
      return { isLoading, canRun: false, reason: 'Region restricted' };
    }

    // If another agent is running
    if (isAnotherAgentRunning) {
      return { isLoading, canRun: false, reason: 'Another agent running' };
    }

    // If not enough service slots, and service is not staked
    const hasSlot = !isNil(hasEnoughServiceSlots) && !hasEnoughServiceSlots;
    if (hasSlot && !isServiceStaked) {
      return { isLoading, canRun: false, reason: 'No available slots' };
    }

    // If was evicted and can't re-stake
    if (isAgentEvicted && !isEligibleForStaking) {
      return { isLoading, canRun: false, reason: 'Evicted' };
    }

    // agent specific checks
    // If the agentsFun field update is not completed, can't start the agent
    if (isAgentsFunFieldUpdateRequired) {
      return { isLoading, canRun: false, reason: 'Update required' };
    }

    // allow starting based on refill requirements
    if (!canStartAgent) {
      return { isLoading, canRun: false, reason: 'Low balance' };
    }

    return { isLoading, canRun: true, loadingReason };
  }, [
    canStartAgent,
    hasEnoughServiceSlots,
    isAgentEvicted,
    isAgentGeoRestricted,
    isAgentsFunFieldUpdateRequired,
    isAnotherAgentRunning,
    isEligibleForStaking,
    isLoading,
    isServiceStaked,
    safeEligibility,
    selectedAgentConfig.isGeoLocationRestricted,
    selectedAgentConfig.isUnderConstruction,
    loadingReason,
  ]);
};
