import { useCallback } from 'react';

import { MiddlewareChain } from '@/client';
import { ETHEREUM_TOKEN_CONFIG, TOKEN_CONFIG } from '@/config/tokens';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { BridgeRequest } from '@/types/Bridge';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { parseUnits } from '@/utils/numberFormatters';

import { getFromToken } from '../Bridge/utils';

const fromChainConfig = ETHEREUM_TOKEN_CONFIG;

/**
 * Get bridge requirements parameters from the input provided by the user.
 */
export const useAddFundsGetBridgeRequirementsParams = (
  destinationAddress?: Address,
) => {
  const { masterEoa, masterSafes } = useMasterWalletContext();
  const { selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const toChainConfig = TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)];
  const masterSafe = masterSafes?.find(
    ({ evmChainId: chainId }) => selectedAgentConfig.evmHomeChainId === chainId,
  );

  return useCallback(
    (tokenAddress: Address, amount: number): BridgeRequest => {
      if (!masterEoa) throw new Error('Master EOA is not available');
      if (!masterSafe) throw new Error('Master Safe is not available');

      const fromToken = getFromToken(
        tokenAddress,
        fromChainConfig,
        toChainConfig,
      );

      return {
        from: {
          chain: MiddlewareChain.ETHEREUM,
          address: masterEoa.address,
          token: fromToken,
        },
        to: {
          chain: toMiddlewareChain,
          address: destinationAddress ?? masterSafe.address,
          token: tokenAddress,
          amount: parseUnits(amount),
        },
      };
    },
    [
      toMiddlewareChain,
      toChainConfig,
      masterEoa,
      masterSafe,
      destinationAddress,
    ],
  );
};
