import { message } from 'antd';
import { useCallback } from 'react';

import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { Nullable } from '@/types/Util';

import { BridgeRetryOutcome } from '../types';

/**
 * Hook to handle retrying the bridge step
 * If refill is required, it will navigate to the refill page
 */
export const useRetryBridge = () => {
  const { refetchForSelectedAgent: refetch } =
    useBalanceAndRefillRequirementsContext();

  return useCallback(
    async (onRetryOutcome: (e: Nullable<BridgeRetryOutcome>) => void) => {
      const { data } = await refetch();
      if (!data) return;

      if (data?.is_refill_required) {
        onRetryOutcome('NEED_REFILL');
      } else {
        message.open({
          icon: null,
          content:
            "Bridging complete! Please restart the app if you're not redirected automatically.",
        });
      }
    },
    [refetch],
  );
};
