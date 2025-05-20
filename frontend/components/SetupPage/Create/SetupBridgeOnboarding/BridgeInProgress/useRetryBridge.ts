import { useCallback } from 'react';

import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { Nullable } from '@/types/Util';

import { BridgeRetryOutcome } from '../types';

/***
 * Hook to handle retrying the bridge step
 * If refill is required, it will navigate to the refill page
 */
export const useRetryBridge = () => {
  const { refetch } = useBalanceAndRefillRequirementsContext();

  return useCallback(
    async (onRetryOutcome: (e: Nullable<BridgeRetryOutcome>) => void) => {
      if (!refetch) return;

      const { data } = await refetch();
      onRetryOutcome(data?.is_refill_required ? 'NEED_REFILL' : null);
    },
    [refetch],
  );
};
