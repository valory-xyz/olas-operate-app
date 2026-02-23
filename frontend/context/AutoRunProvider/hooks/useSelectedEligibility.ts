import { useCallback, useMemo } from 'react';

import { EvmChainId } from '@/constants';
import { useRewardContext, useServices } from '@/hooks';
import { useDeployability } from '@/hooks/useDeployability';

export const useSelectedEligibility = ({
  canCreateSafeForChain,
}: {
  canCreateSafeForChain: (chainId: EvmChainId) => {
    ok: boolean;
    reason?: string;
  };
}) => {
  const { selectedAgentConfig, selectedAgentType } = useServices();
  const { isEligibleForRewards } = useRewardContext();

  const safeEligibility = useMemo(
    () => canCreateSafeForChain(selectedAgentConfig.evmHomeChainId),
    [canCreateSafeForChain, selectedAgentConfig.evmHomeChainId],
  );

  const deployability = useDeployability({ safeEligibility });

  const getSelectedEligibility = useCallback(
    () => ({ canRun: deployability.canRun, reason: deployability.reason }),
    [deployability.canRun, deployability.reason],
  );

  const isSelectedDataLoading = deployability.isLoading;

  return {
    selectedAgentType,
    selectedAgentConfig,
    isEligibleForRewards,
    isSelectedDataLoading,
    getSelectedEligibility,
  };
};
