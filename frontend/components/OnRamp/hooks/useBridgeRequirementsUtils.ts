import { useCallback } from 'react';

import { TOKEN_CONFIG, TokenSymbol } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { useOnRampContext } from '@/hooks';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { getTokenDetails } from '@/utils';
import {
  asEvmChainDetails,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

export const useBridgeRequirementsUtils = (onRampChainId: EvmChainId) => {
  const { selectedChainId } = useOnRampContext();

  // eg, for Optimus, the receiving tokens are ETH, USDC, OLAS with amounts.
  const getReceivingTokens = useCallback(
    (bridgeParams: BridgeRefillRequirementsRequest | null) => {
      if (!bridgeParams) return [];
      if (!selectedChainId) return [];

      const toChainConfig = TOKEN_CONFIG[selectedChainId];

      return bridgeParams.bridge_requests.map((request) => {
        const { token: toToken, amount } = request.to;
        const token = getTokenDetails(toToken, toChainConfig);
        return {
          amount: formatUnitsToNumber(amount, token?.decimals),
          symbol: token?.symbol as TokenSymbol,
        };
      });
    },
    [selectedChainId],
  );

  // Cannot bridge the token if the onRampChainId is the same as the middleware home chain.
  // eg. for Optimism, we cannot bridge ETH to Optimism if we are on Optimism.
  const canIgnoreNativeToken = selectedChainId === onRampChainId;

  /**
   * List of tokens to bridge, excluding the native token, if onRampChainId
   * matches the middleware home chain.
   *
   * For example,
   * - Optimus, tokens to bridge: [USDC, OLAS]
   * - Gnosis, tokens to bridge: [ETH, USDC, OLAS]
   */
  const getTokensToBeBridged = useCallback(
    (receivingTokens: { symbol: TokenSymbol; amount: number }[]) => {
      if (receivingTokens.length === 0) return [];
      if (!selectedChainId) return [];

      const currentChainSymbol = asEvmChainDetails(
        asMiddlewareChain(selectedChainId),
      ).symbol;

      if (!canIgnoreNativeToken) {
        return receivingTokens.map((token) => token.symbol);
      }

      const filteredTokens = receivingTokens.filter(
        (token) => token.symbol !== currentChainSymbol,
      );
      return filteredTokens.map((token) => token.symbol);
    },
    [selectedChainId, canIgnoreNativeToken],
  );

  // Filter out the native token from the bridge requests
  const getBridgeParamsExceptNativeToken = useCallback(
    (bridgeParams: BridgeRefillRequirementsRequest | null) => {
      if (!bridgeParams) return null;

      const filteredParams = bridgeParams.bridge_requests.filter(
        (request) => request.to.token !== AddressZero,
      );
      const bridgeRequest = canIgnoreNativeToken
        ? filteredParams
        : bridgeParams.bridge_requests;
      return { ...bridgeParams, bridge_requests: bridgeRequest };
    },
    [canIgnoreNativeToken],
  );

  return {
    canIgnoreNativeToken,
    getReceivingTokens,
    getTokensToBeBridged,
    getBridgeParamsExceptNativeToken,
  };
};
