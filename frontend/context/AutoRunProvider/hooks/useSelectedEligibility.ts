import { useCallback, useMemo } from 'react';

import { EvmChainId } from '@/constants';
import {
  useActiveStakingContractDetails,
  useAgentRunning,
  useBalanceAndRefillRequirementsContext,
  useIsAgentGeoRestricted,
  useOnlineStatusContext,
  useRewardContext,
  useServices,
  useSharedContext,
} from '@/hooks';

export const useSelectedEligibility = ({
  canCreateSafeForChain,
}: {
  canCreateSafeForChain: (chainId: EvmChainId) => {
    ok: boolean;
    reason?: string;
  };
}) => {
  const {
    selectedAgentType,
    selectedAgentConfig,
    isLoading: isServicesLoading,
  } = useServices();
  const { isOnline } = useOnlineStatusContext();
  const { isEligibleForRewards } = useRewardContext();
  const { isAgentsFunFieldUpdateRequired } = useSharedContext();
  const { canStartAgent, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const {
    isAgentEvicted,
    isEligibleForStaking,
    isServiceStaked,
    hasEnoughServiceSlots,
    isSelectedStakingContractDetailsLoading,
  } = useActiveStakingContractDetails();
  const { isAnotherAgentRunning } = useAgentRunning();

  const { isAgentGeoRestricted, isGeoLoading } = useIsAgentGeoRestricted({
    agentType: selectedAgentType,
    agentConfig: selectedAgentConfig,
  });

  const isSelectedDataLoading = useMemo(() => {
    if (!isOnline) return true;
    if (isServicesLoading) return true;
    if (isBalancesAndFundingRequirementsLoading) return true;
    if (isSelectedStakingContractDetailsLoading) return true;
    if (isGeoLoading) return true;
    return false;
  }, [
    isBalancesAndFundingRequirementsLoading,
    isGeoLoading,
    isOnline,
    isSelectedStakingContractDetailsLoading,
    isServicesLoading,
  ]);

  const getSelectedEligibility = useCallback(() => {
    if (selectedAgentConfig.isUnderConstruction) {
      return { canRun: false, reason: 'Under construction' };
    }

    if (selectedAgentConfig.isGeoLocationRestricted && isAgentGeoRestricted) {
      return { canRun: false, reason: 'Region restricted' };
    }

    if (isAgentEvicted && !isEligibleForStaking) {
      return { canRun: false, reason: 'Evicted' };
    }

    const hasSlot =
      hasEnoughServiceSlots !== null && hasEnoughServiceSlots === false;

    if (hasSlot && !isServiceStaked) {
      return { canRun: false, reason: 'No available slots' };
    }

    const safeEligibility = canCreateSafeForChain(
      selectedAgentConfig.evmHomeChainId,
    );
    if (!safeEligibility.ok) {
      return { canRun: false, reason: safeEligibility.reason };
    }

    if (isAgentsFunFieldUpdateRequired) {
      return { canRun: false, reason: 'Update required' };
    }

    if (isAnotherAgentRunning) {
      return { canRun: false, reason: 'Another agent running' };
    }

    if (!canStartAgent) {
      return { canRun: false, reason: 'Low balance' };
    }

    return { canRun: true };
  }, [
    canCreateSafeForChain,
    canStartAgent,
    hasEnoughServiceSlots,
    isAgentEvicted,
    isAgentGeoRestricted,
    isAgentsFunFieldUpdateRequired,
    isAnotherAgentRunning,
    isEligibleForStaking,
    isServiceStaked,
    selectedAgentConfig.evmHomeChainId,
    selectedAgentConfig.isGeoLocationRestricted,
    selectedAgentConfig.isUnderConstruction,
  ]);

  return {
    selectedAgentType,
    selectedAgentConfig,
    isEligibleForRewards,
    isSelectedDataLoading,
    getSelectedEligibility,
  };
};
