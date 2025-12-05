import { useCallback } from 'react';

import { ETHEREUM_TOKEN_CONFIG, TOKEN_CONFIG } from '@/config/tokens';
import { MiddlewareChainMap } from '@/constants';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { BridgeRequest } from '@/types/Bridge';
import { getFromToken, getTokenDecimal } from '@/utils';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { parseUnits } from '@/utils/numberFormatters';

const fromChainConfig = ETHEREUM_TOKEN_CONFIG;

/**
 * Get bridge requirements parameters from the input provided by the user.
 */
export const useAddFundsGetBridgeRequirementsParams = (
  destinationAddress?: Address,
) => {
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletFetched,
  } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const toChainConfig = TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)];

  return useCallback(
    (tokenAddress: Address, amount: number): BridgeRequest => {
      if (!masterEoa) throw new Error('Master EOA is not available');
      if (!isMasterWalletFetched) throw new Error('Master Safe not loaded');

      const fromToken = getFromToken(
        tokenAddress,
        fromChainConfig,
        toChainConfig,
      );
      const tokenDecimal = getTokenDecimal(tokenAddress, toChainConfig);

      const fromChain = MiddlewareChainMap.ETHEREUM;
      const masterSafeOnFromChain = getMasterSafeOf?.(asEvmChainId(fromChain));

      const masterSafeOnToChain = getMasterSafeOf?.(
        selectedAgentConfig.evmHomeChainId,
      );

      if (!masterSafeOnToChain) throw new Error('Master Safe is not available');

      return {
        from: {
          chain: fromChain,
          address: masterSafeOnFromChain?.address ?? masterEoa.address,
          token: fromToken,
        },
        to: {
          chain: toMiddlewareChain,
          address: destinationAddress ?? masterSafeOnToChain.address,
          token: tokenAddress,
          amount: parseUnits(amount, tokenDecimal),
        },
      };
    },
    [
      masterEoa,
      isMasterWalletFetched,
      toChainConfig,
      getMasterSafeOf,
      selectedAgentConfig.evmHomeChainId,
      toMiddlewareChain,
      destinationAddress,
    ],
  );
};
