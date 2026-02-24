import { useCallback, useMemo } from 'react';

import { EvmChainId } from '@/constants';
import { useServices } from '@/hooks';
import { useDeployability } from '@/hooks/useDeployability';

type UseSelectedEligibilityProps = {
  canCreateSafeForChain: (chainId: EvmChainId) => {
    ok: boolean;
    reason?: string;
  };
};

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
    () => ({ canRun: deployability.canRun, reason: deployability.reason }),
    [deployability.canRun, deployability.reason],
  );

  return {
    selectedAgentType,
    selectedAgentConfig,
    isSelectedAgentDetailsLoading,
    getSelectedEligibility,
  };
};
