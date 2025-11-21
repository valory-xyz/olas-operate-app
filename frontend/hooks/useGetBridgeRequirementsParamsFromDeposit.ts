import { entries } from 'lodash';
import { useCallback, useMemo } from 'react';

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
 */
export const useGetBridgeRequirementsParamsFromDeposit = (
  onRampChainId: EvmChainId,
) => {
  const { amountsToDeposit, masterSafeAddress, walletChainId } =
    usePearlWallet();
  const { masterEoa } = useMasterWalletContext();
  const chainId = onRampChainId || walletChainId;

  const chainConfig = useMemo(() => {
    if (!chainId) return null;
    return TOKEN_CONFIG[chainId];
  }, [chainId]);

  const middlewareChain = useMemo(() => {
    if (!chainId) return null;
    return asMiddlewareChain(chainId);
  }, [chainId]);

  return useCallback(
    (isForceUpdate = false): BridgeRefillRequirementsRequest | null => {
      if (!amountsToDeposit || !chainConfig || !middlewareChain) return null;
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
              `Token ${tokenSymbol} is not supported on chain ${chainId}`,
            );
          }

          const toTokenAddress = token.address ?? AddressZero;
          const fromToken = AddressZero; // Always swap from ETH (purchased via Transak)
          const tokenDecimal = getTokenDecimal(toTokenAddress, chainConfig);

          return {
            from: {
              chain: middlewareChain,
              address: masterEoa.address,
              token: fromToken,
            },
            to: {
              chain: middlewareChain,
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
      middlewareChain,
      masterEoa?.address,
      masterSafeAddress,
      chainId,
    ],
  );
};
