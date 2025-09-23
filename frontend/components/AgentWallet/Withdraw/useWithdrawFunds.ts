import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { SupportedMiddlewareChainMap } from '@/constants/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import { useMasterWalletContext, useServices } from '@/hooks';
import { Address, TxnHash } from '@/types/Address';

/**
 * {
 *   "message": "Funds withdrawn successfully.",
 *   "transfer_txs": {
 *     "gnosis": {
 *       // List of successful txs from Master Safe and/or Master EOA
 *       "0x0000000000000000000000000000000000000000": ["0x...", "0x..."], 
 *       "0x...": ["0x...", "0x..."]
 *     }
 *   }
}
 */
type WithdrawalResponse = {
  message: string;
  transfer_txs: {
    [chain in keyof typeof SupportedMiddlewareChainMap]?: TxnHash[];
  };
};

// API call to withdraw funds
const withdrawFunds = async (
  withdrawAddress: Address,
): Promise<WithdrawalResponse> =>
  fetch(`${BACKEND_URL}/wallet/withdraw`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ withdrawal_address: withdrawAddress }),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to withdraw funds from Agent Wallet');
    })
    .catch((error) => {
      throw error;
    });

/**
 * Hook to handle withdrawal of funds
 */
export const useWithdrawFunds = () => {
  const { selectedAgentConfig } = useServices();
  const { masterSafes } = useMasterWalletContext();

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;
  const masterSafeAddress = useMemo(() => {
    const safe = masterSafes?.find(
      ({ evmChainId }) => evmChainId === evmHomeChainId,
    );
    return safe?.address;
  }, [masterSafes, evmHomeChainId]);

  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
    mutationFn: async (withdrawAddress: Address) => {
      await withdrawFunds(withdrawAddress);
    },
    onError: (error) => console.error(error),
  });

  const onWithdrawFunds = useCallback(async () => {
    if (!masterSafeAddress) {
      throw new Error('Master Safe address not found');
    }

    try {
      await mutateAsync(masterSafeAddress);
    } catch (error) {
      console.error(error);
    }
  }, [mutateAsync, masterSafeAddress]);

  return {
    isLoading: isPending,
    isSuccess,
    isError,
    onWithdrawFunds,
  };
};
