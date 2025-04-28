import { useCallback } from 'react';

import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';

import { BridgeRetryOutcome } from '../types';

/***
 * Hook to handle retrying the bridge step
 * If refill is required, it will navigate to the refill page
 * If not, it will skip the bridge step
 */
export const useRetryBridge = () => {
  const { refetch } = useBalanceAndRefillRequirementsContext();

  return useCallback(
    async (onRetryOutcome: (e: BridgeRetryOutcome) => void) => {
      onRetryOutcome('NAVIGATE_TO_REFILL');
      if (!refetch) return;

      const { data } = await refetch();
      onRetryOutcome(
        data?.is_refill_required ? 'NAVIGATE_TO_REFILL' : 'SKIP_BRIDGE_STEP',
      );
    },
    [refetch],
  );
};
