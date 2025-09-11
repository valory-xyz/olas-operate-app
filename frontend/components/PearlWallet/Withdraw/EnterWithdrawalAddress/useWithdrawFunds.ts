import { useMutation } from '@tanstack/react-query';
import { entries } from 'lodash';
import { useCallback } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { ChainTokenConfig, TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import {
  SupportedMiddlewareChain,
  SupportedMiddlewareChainMap,
} from '@/constants/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import { Address, TxnHash } from '@/types/Address';
import { parseUnits } from '@/utils/numberFormatters';

import { usePearlWallet } from '../../PearlWalletContext';

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
    [chain in keyof SupportedMiddlewareChain]?: {
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
  amountsToWithdraw: { [symbol: string]: number },
  chainConfig: ChainTokenConfig,
) =>
  entries(amountsToWithdraw).reduce(
    (acc, [symbol, amount]) => {
      if (amount <= 0) return acc;
      if (!chainConfig[symbol]) return acc;

      const { tokenType, address, decimals } = chainConfig[symbol];
      const tokenAddress =
        tokenType === TokenType.NativeGas ? AddressZero : address;

      if (tokenAddress) {
        acc[tokenAddress] = parseUnits(amount, decimals);
      }
      return acc;
    },
    {} as { [token: Address]: string },
  );

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
  const { walletChainId, amountsToWithdraw } = usePearlWallet();
  // const [message, setMessage] = useState<string | null>(null);

  const { isPending, isSuccess, isError, data, mutateAsync, status } =
    useMutation({
      // onMutate: () => {
      //   setMessage(null);
      // },
      mutationFn: async (withdrawalRequest: WithdrawalRequest) => {
        const response = await withdrawFunds({
          ...withdrawalRequest,
        });
        // setMessage(response.message);
        return response;
      },
    });

  const onAuthorizeWithdrawal = useCallback(
    async (withdrawAddress: string, password: string) => {
      if (!walletChainId) return;

      const chainConfig = TOKEN_CONFIG[walletChainId];
      const assets = formatWithdrawAssets(amountsToWithdraw, chainConfig);
      const { middlewareChain } = CHAIN_CONFIG[walletChainId];

      const request = {
        password,
        to: withdrawAddress as Address,
        withdraw_assets: { [middlewareChain]: assets },
      } satisfies WithdrawalRequest;

      console.log({ request });
      // await mutateAsync(request);
    },
    [walletChainId, amountsToWithdraw],
  );

  const isPasswordError = isError && data;

  return { isLoading: isPending, onAuthorizeWithdrawal };
};
