import { entries } from 'lodash';
import { useCallback, useMemo } from 'react';

import { getTokenDecimal } from '@/components/Bridge/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero, TokenSymbol } from '@/constants';
import { onRampChainMap } from '@/constants/chains';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useMasterWalletContext } from '@/hooks';
import { BridgeRefillRequirementsRequest, BridgeRequest } from '@/types/Bridge';
import { TokenAmountDetails } from '@/types/Wallet';
import { asMiddlewareChain, parseUnits } from '@/utils';

/**
 * Hook to get bridge requirements parameters from amountsToDeposit for on-ramp deposit flow.
 * Converts user-specified deposit amounts into bridge requirements that can be used to
 * bridge ETH to the wallet chain and swap to required tokens.
 */
export const useGetBridgeRequirementsParamsFromDeposit = () => {
  const { amountsToDeposit, masterSafeAddress, walletChainId } =
    usePearlWallet();
  const { masterEoa } = useMasterWalletContext();

  const actualOnRampChainId = useMemo(() => {
    if (!walletChainId) return null;
    const middlewareChain = asMiddlewareChain(walletChainId);
    return onRampChainMap[middlewareChain];
  }, [walletChainId]);

  const walletChainConfig = useMemo(() => {
    if (!walletChainId) return null;
    return TOKEN_CONFIG[walletChainId];
  }, [walletChainId]);

  const onRampChainConfig = useMemo(() => {
    if (!actualOnRampChainId) return null;
    return TOKEN_CONFIG[actualOnRampChainId];
  }, [actualOnRampChainId]);

  const walletMiddlewareChain = useMemo(() => {
    if (!walletChainId) return null;
    return asMiddlewareChain(walletChainId);
  }, [walletChainId]);

  const onRampMiddlewareChain = useMemo(() => {
    if (!actualOnRampChainId) return null;
    return asMiddlewareChain(actualOnRampChainId);
  }, [actualOnRampChainId]);

  return useCallback(
    (isForceUpdate = false): BridgeRefillRequirementsRequest | null => {
      if (!amountsToDeposit || !walletChainConfig || !onRampChainConfig)
        return null;
      if (!walletMiddlewareChain || !onRampMiddlewareChain) return null;
      if (!masterEoa?.address || !masterSafeAddress) return null;

      const toDeposit = entries(amountsToDeposit).filter(
        ([, { amount }]) => amount && amount > 0,
      ) as [TokenSymbol, TokenAmountDetails][];

      if (toDeposit.length === 0) return null;

      const bridgeRequests: BridgeRequest[] = toDeposit.map(
        ([tokenSymbol, { amount }]) => {
          const toToken = walletChainConfig[tokenSymbol];
          if (!toToken) {
            throw new Error(
              `Token ${tokenSymbol} is not supported on wallet chain ${walletChainId}`,
            );
          }

          const toTokenAddress = toToken.address ?? AddressZero;
          const fromToken = AddressZero; // Always ETH for on-ramp flow
          const tokenDecimal = getTokenDecimal(
            toTokenAddress,
            walletChainConfig,
          );

          return {
            from: {
              chain: onRampMiddlewareChain,
              address: masterEoa.address,
              token: fromToken,
            },
            to: {
              chain: walletMiddlewareChain,
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
      walletChainConfig,
      onRampChainConfig,
      walletMiddlewareChain,
      onRampMiddlewareChain,
      masterEoa?.address,
      masterSafeAddress,
      walletChainId,
    ],
  );
};
