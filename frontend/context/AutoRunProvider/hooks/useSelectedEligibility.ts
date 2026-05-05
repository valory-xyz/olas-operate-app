import { useCallback, useEffect, useMemo, useRef } from 'react';

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
 * Selected-agent eligibility adapter.
 *
 * It combines safe readiness + deployability and exposes a stable getter for
 * async auto-run flows.
 *
 * Example:
 * scanner selects `memeooorr` -> UI rerenders ->
 * async scanner calls `getSelectedEligibility()` and gets latest canRun/reason.
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

  // Keep latest eligibility in a ref to avoid stale closures in long async loops.
  const latestEligibilityRef = useRef({
    canRun: deployability.canRun,
    reason: deployability.reason,
    loadingReason: deployability.loadingReason,
  });

  useEffect(() => {
    latestEligibilityRef.current = {
      canRun: deployability.canRun,
      reason: deployability.reason,
      loadingReason: deployability.loadingReason,
    };
  }, [deployability.canRun, deployability.loadingReason, deployability.reason]);

  const getSelectedEligibility = useCallback(
    () => latestEligibilityRef.current,
    [],
  );

  return {
    selectedAgentType,
    selectedAgentConfig,
    isSelectedAgentDetailsLoading,
    getSelectedEligibility,
  };
};
