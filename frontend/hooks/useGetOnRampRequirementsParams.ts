import { useCallback, useMemo } from 'react';

import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero, EvmChainId } from '@/constants';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { Address } from '@/types/Address';
import { BridgeRequest } from '@/types/Bridge';
import { asMiddlewareChain, getTokenDecimal, parseUnits } from '@/utils';

import { useMasterWalletContext } from './useWallet';

/**
 * Hook to create on-ramp requirements params from token address and amount.
 * Used in deposit mode where user manually provides amounts.
 *
 * @param onRampChainId - The chain ID where on-ramping will occur
 * @returns Function that creates BridgeRequest from token address and amount
 */
export const useGetOnRampRequirementsParams = (onRampChainId: EvmChainId) => {
  const { walletChainId } = usePearlWallet();
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletFetched,
  } = useMasterWalletContext();

  const masterSafe = useMemo(
    () => (walletChainId ? getMasterSafeOf?.(walletChainId) : undefined),
    [getMasterSafeOf, walletChainId],
  );

  const toChainConfig = walletChainId ? TOKEN_CONFIG[walletChainId] : undefined;
  const fromChain = asMiddlewareChain(onRampChainId);
  const toChain = walletChainId ? asMiddlewareChain(walletChainId) : undefined;
  const fromAddress =
    getMasterSafeOf?.(onRampChainId)?.address ?? masterEoa?.address;
  const toAddress = masterSafe?.address ?? masterEoa?.address;

  return useCallback(
    (toTokenAddress: Address, amount: number) => {
      if (
        !masterEoa ||
        !isMasterWalletFetched ||
        !fromAddress ||
        !toAddress ||
        !toChainConfig ||
        !toChain
      ) {
        return null;
      }

      const tokenDecimal = getTokenDecimal(toTokenAddress, toChainConfig);

      return {
        from: {
          chain: fromChain,
          address: fromAddress,
          token: AddressZero,
        },
        to: {
          chain: toChain,
          address: toAddress,
          token: toTokenAddress,
          amount: parseUnits(amount, tokenDecimal),
        },
      } satisfies BridgeRequest;
    },
    [
      masterEoa,
      isMasterWalletFetched,
      fromAddress,
      toAddress,
      toChainConfig,
      fromChain,
      toChain,
    ],
  );
};
