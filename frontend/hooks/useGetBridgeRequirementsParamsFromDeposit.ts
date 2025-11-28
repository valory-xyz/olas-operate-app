import { entries } from 'lodash';
import { useCallback } from 'react';

import { getTokenDecimal } from '@/components/Bridge/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero, EvmChainId, TokenSymbol } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useMasterWalletContext } from '@/hooks';
import { BridgeRefillRequirementsRequest, BridgeRequest } from '@/types/Bridge';
import { TokenAmountDetails } from '@/types/Wallet';
import { asMiddlewareChain, parseUnits } from '@/utils';

/**
 * Hook to get bridge requirements parameters from amountsToDeposit for on-ramp deposit flow.
 * This converts user-specified deposit amounts into bridge requirements that can be used
 * to swap ETH (purchased via Transak) back to the required tokens (USDC, OLAS, etc.).
 *
 * @param onRampChainId - The chain where ETH will be purchased (via Transak)
 * @param walletChainId - The chain where tokens will be deposited (for token lookups)
 */
export const useGetBridgeRequirementsParamsFromDeposit = (
  onRampChainId: EvmChainId,
  walletChainId?: EvmChainId,
) => {
  const {
    amountsToDeposit,
    masterSafeAddress,
    walletChainId: defaultWalletChainId,
  } = usePearlWallet();
  const { masterEoa } = useMasterWalletContext();

  // Use walletChainId for token lookups (where tokens will be deposited)
  // Use onRampChainId for the bridge from chain (where ETH will be purchased)
  const tokenLookupChainId = (() => {
    if (walletChainId) {
      return walletChainId;
    }
    if (defaultWalletChainId) {
      return defaultWalletChainId;
    }
    return onRampChainId;
  })();
  const chainConfig = TOKEN_CONFIG[tokenLookupChainId];
  const fromMiddlewareChain = asMiddlewareChain(onRampChainId);
  const toMiddlewareChain = asMiddlewareChain(tokenLookupChainId);

  return useCallback(
    (isForceUpdate = false): BridgeRefillRequirementsRequest | null => {
      if (!amountsToDeposit) return null;
      if (!masterEoa?.address || !masterSafeAddress) return null;

      const toDeposit = entries(amountsToDeposit).filter(
        ([, { amount }]) => amount && amount > 0,
      ) as [TokenSymbol, TokenAmountDetails][];

      if (toDeposit.length === 0) return null;

      const bridgeRequests: BridgeRequest[] = toDeposit.map(
        ([tokenSymbol, { amount }]) => {
          const token = chainConfig[tokenSymbol];
          if (!token) {
            throw new Error(
              `Token ${tokenSymbol} is not supported on chain ${tokenLookupChainId}`,
            );
          }

          const toTokenAddress = token.address ?? AddressZero;
          const fromToken = AddressZero; // Always swap from ETH (purchased via Transak)
          const tokenDecimal = getTokenDecimal(toTokenAddress, chainConfig);

          return {
            from: {
              chain: fromMiddlewareChain,
              address: masterEoa.address,
              token: fromToken,
            },
            to: {
              chain: toMiddlewareChain,
              address: masterSafeAddress,
              token: toTokenAddress,
              amount: parseUnits(amount, tokenDecimal),
            },
          } satisfies BridgeRequest;
        },
      );

      return {
        bridge_requests: bridgeRequests,
        force_update: isForceUpdate,
      };
    },
    [
      amountsToDeposit,
      chainConfig,
      fromMiddlewareChain,
      toMiddlewareChain,
      masterEoa?.address,
      masterSafeAddress,
      tokenLookupChainId,
    ],
  );
};
