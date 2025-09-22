import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { SupportedMiddlewareChainMap } from '@/constants/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import {
  BACKEND_URL,
  EXPLORER_URL_BY_MIDDLEWARE_CHAIN,
} from '@/constants/urls';
import { Address, TxnHash } from '@/types/Address';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

import { useAgentWallet } from '../AgentWalletProvider';

/**
 * {
 *   "password": "your_password",
 *   "to": "0x...",
 *    "withdraw_assets": {
 *      "gnosis": {
 *       "0x0000000000000000000000000000000000000000": 1000000000000000000, ...
 *     }
 *   }
 * }
 */
type WithdrawalRequest = {
  password: string;
  to: Address;
  withdraw_assets: {
    [chain in keyof typeof SupportedMiddlewareChainMap]?: {
      [token: Address]: string;
    };
  };
};

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
  request: WithdrawalRequest,
): Promise<WithdrawalResponse> =>
  fetch(`${BACKEND_URL}/wallet/withdraw`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to withdraw funds');
    })
    .catch((error) => {
      throw error;
    });

/**
 * Hook to handle withdrawal of funds
 */
export const useWithdrawFunds = () => {
  const { walletChainId } = useAgentWallet();

  const { isPending, isSuccess, isError, data } = useMutation({
    mutationFn: async (withdrawalRequest: WithdrawalRequest) => {
      try {
        const response = await withdrawFunds(withdrawalRequest);
        return response;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    onError: (error) => console.error(error),
  });

  const txnHashes = useMemo(() => {
    if (!isSuccess) return [];
    if (!walletChainId) return [];
    if (!data?.transfer_txs || !walletChainId) return [];

    const { middlewareChain } = CHAIN_CONFIG[walletChainId];
    const chainTxs =
      data.transfer_txs[middlewareChain as keyof typeof data.transfer_txs];
    if (!chainTxs) return [];

    return chainTxs.map(
      (txHash) =>
        `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[asMiddlewareChain(walletChainId)]}/tx/${txHash}`,
    );
  }, [isSuccess, data, walletChainId]);

  return {
    isLoading: isPending,
    isSuccess,
    isError,
    txnHashes,
  };
};
