import { isNil } from 'lodash';
import { useMemo } from 'react';

import { ELIGIBILITY_REASON } from '@/context/AutoRunProvider';
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
  const { isOnline } = useOnlineStatusContext();
  const { isAgentsFunFieldUpdateRequired } = useSharedContext();
  const { isAnotherAgentRunning } = useAgentRunning();
  const {
    selectedAgentConfig,
    selectedAgentType,
    selectedService,
    isLoading: isServicesLoading,
  } = useServices();
  const {
    allowStartAgentByServiceConfigId,
    isBalancesAndFundingRequirementsEnabledForAllServices,
    isBalancesAndFundingRequirementsLoadingForAllServices,
  } = useBalanceAndRefillRequirementsContext();
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

  const selectedServiceConfigId = selectedService?.service_config_id;
  const canStartSelectedAgent = useMemo(() => {
    if (!selectedServiceConfigId) return false;
    return allowStartAgentByServiceConfigId(selectedServiceConfigId);
  }, [allowStartAgentByServiceConfigId, selectedServiceConfigId]);

  const loadingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!isOnline) reasons.push('Offline');
    if (isServicesLoading) reasons.push('Services');
    if (
      !isBalancesAndFundingRequirementsEnabledForAllServices ||
      isBalancesAndFundingRequirementsLoadingForAllServices
    ) {
      reasons.push('Balances');
    }
    if (isSelectedStakingContractDetailsLoading) reasons.push('Staking');
    if (isGeoLoading) reasons.push('Geo');
    if (safeEligibility?.isLoading) reasons.push('Safe');
    return reasons;
  }, [
    isBalancesAndFundingRequirementsEnabledForAllServices,
    isBalancesAndFundingRequirementsLoadingForAllServices,
    isGeoLoading,
    isOnline,
    isSelectedStakingContractDetailsLoading,
    isServicesLoading,
    safeEligibility?.isLoading,
  ]);

  // If any of the loading reasons are true, we consider it loading.
  // We also capture a combined loading reason string for display if needed.
  const isLoading = loadingReasons.length > 0;
  const loadingReason =
    loadingReasons.length > 0 ? loadingReasons.join(', ') : undefined;

  return useMemo(() => {
    if (safeEligibility && !safeEligibility.ok && !safeEligibility.isLoading) {
      return {
        isLoading,
        canRun: false,
        reason: safeEligibility.reason,
        loadingReason,
      };
    }

    if (isLoading) {
      return {
        isLoading,
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
        loadingReason,
      };
    }

    // If service is under construction
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
      return {
        isLoading,
        canRun: false,
        reason: ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING,
      };
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
    if (!canStartSelectedAgent) {
      return { isLoading, canRun: false, reason: 'Low balance' };
    }

    return { isLoading, canRun: true, loadingReason };
  }, [
    canStartSelectedAgent,
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
