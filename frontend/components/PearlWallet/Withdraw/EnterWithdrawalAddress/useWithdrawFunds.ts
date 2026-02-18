import { useMutation } from '@tanstack/react-query';
import { entries, values } from 'lodash';
import { useCallback, useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import {
  ChainTokenConfig,
  TOKEN_CONFIG,
  TokenSymbol,
  TokenType,
} from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { SupportedMiddlewareChainMap } from '@/constants/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import {
  BACKEND_URL,
  EXPLORER_URL_BY_MIDDLEWARE_CHAIN,
} from '@/constants/urls';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { AvailableAsset, TokenAmounts } from '@/types';
import { Address, TxnHash } from '@/types/Address';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { parseUnits } from '@/utils/numberFormatters';

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
 * }
 */
type WithdrawalResponse = {
  message: string;
  transfer_txs: {
    [chain in keyof typeof SupportedMiddlewareChainMap]?: {
      [token: Address]: TxnHash[];
    };
  };
};

/**
 * Convert amountsToWithdraw to the required format
 * @example
 * {
 *   "gnosis": {
 *     "0x0000000000000000000000000000000000000000": "1000000000000000000",
 *     "0x...": "1000000000000000000"
 *   }
 * }
 */
const formatWithdrawAssets = (
  amountsToWithdraw: TokenAmounts,
  availableAssets: AvailableAsset[],
  chainConfig: ChainTokenConfig,
) =>
  entries(amountsToWithdraw).reduce(
    (acc, [untypedSymbol, { amount, withdrawAll }]) => {
      const symbol = untypedSymbol as TokenSymbol;

      if (amount <= 0) return acc;
      if (!chainConfig[symbol]) return acc;

      const tokenConfig = chainConfig[symbol];
      if (!tokenConfig) return acc;

      const { tokenType, address, decimals } = tokenConfig;
      const tokenAddress =
        tokenType === TokenType.NativeGas ? AddressZero : address;

      if (!tokenAddress) return acc;

      // Determine the amount to withdraw
      // if withdrawAll is true, use the full available amount
      const withdrawableAmount = (() => {
        if (!withdrawAll) return amount;
        const asset = availableAssets.find((asset) => asset.symbol === symbol);
        return asset?.amountInStr ?? '0';
      })();

      acc[tokenAddress] = parseUnits(withdrawableAmount, decimals) || '0';
      return acc;
    },
    {} as { [token: Address]: string },
  );

/**
 * API call to withdraw funds
 */
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
  const { walletChainId, amountsToWithdraw, availableAssets } =
    usePearlWallet();

  const { isPending, isSuccess, isError, data, mutateAsync } = useMutation<
    WithdrawalResponse,
    unknown,
    WithdrawalRequest
  >({
    mutationFn: async (withdrawalRequest) =>
      await withdrawFunds(withdrawalRequest),
  });

  const onAuthorizeWithdrawal = useCallback(
    async (withdrawAddress: string, password: string) => {
      if (!walletChainId) return;

      const { middlewareChain } = CHAIN_CONFIG[walletChainId];
      const chainConfig = TOKEN_CONFIG[walletChainId];
      const assets = formatWithdrawAssets(
        amountsToWithdraw,
        availableAssets,
        chainConfig,
      );

      const request = {
        password,
        to: withdrawAddress as Address,
        withdraw_assets: { [middlewareChain]: assets },
      } satisfies WithdrawalRequest;

      try {
        const response = await mutateAsync(request);
        return response;
      } catch (error) {
        console.error(error);
      }
    },
    [walletChainId, amountsToWithdraw, mutateAsync, availableAssets],
  );

  const txnHashes = useMemo(() => {
    if (!isSuccess) return [];
    if (!walletChainId) return [];
    if (!data?.transfer_txs || !walletChainId) return [];

    const { middlewareChain } = CHAIN_CONFIG[walletChainId];
    const chainTxs =
      data.transfer_txs[middlewareChain as keyof typeof data.transfer_txs];
    if (!chainTxs) return [];

    const txnHashes: TxnHash[] = values(chainTxs).flat();
    return txnHashes.map(
      (txHash) =>
        `${EXPLORER_URL_BY_MIDDLEWARE_CHAIN[asMiddlewareChain(walletChainId)]}/tx/${txHash}`,
    );
  }, [isSuccess, data, walletChainId]);

  return {
    isLoading: isPending,
    isSuccess,
    isError,
    txnHashes,
    onAuthorizeWithdrawal,
  };
};
