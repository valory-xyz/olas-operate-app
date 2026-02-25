import { useCallback, useMemo } from 'react';

import { EvmChainId } from '@/constants';
import { useServices } from '@/hooks';
import { useDeployability } from '@/hooks/useDeployability';

type UseSelectedEligibilityProps = {
  canCreateSafeForChain: (chainId: EvmChainId) => {
    ok: boolean;
    reason?: string;
    isLoading?: boolean;
  };
};

/**
 * Hook to determine the eligibility of the currently selected agent for auto-run,
 * based on the selected agent config and various conditions that could prevent deployment.
 */
export const useSelectedEligibility = ({
  canCreateSafeForChain,
}: UseSelectedEligibilityProps) => {
  const { selectedAgentConfig, selectedAgentType } = useServices();

  const safeEligibility = useMemo(
    () => canCreateSafeForChain(selectedAgentConfig.evmHomeChainId),
    [canCreateSafeForChain, selectedAgentConfig.evmHomeChainId],
  );

  const deployability = useDeployability({ safeEligibility });
  const isSelectedAgentDetailsLoading = deployability.isLoading;

  const getSelectedEligibility = useCallback(
    () => ({
      canRun: deployability.canRun,
      reason: deployability.reason,
      loadingReason: deployability.loadingReason,
    }),
    [deployability.canRun, deployability.loadingReason, deployability.reason],
  );

  return {
    selectedAgentType,
    selectedAgentConfig,
    isSelectedAgentDetailsLoading,
    getSelectedEligibility,
  };
};
