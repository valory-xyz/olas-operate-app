import { useCallback, useEffect, useMemo, useState } from 'react';

import { getTokenDetails } from '@/components/Bridge/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol } from '@/constants/token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { delayInSeconds } from '@/utils/delay';
import { asEvmChainDetails, asEvmChainId } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useGetBridgeRequirementsParams } from '../../hooks/useGetBridgeRequirementsParams';

/**
 * Hook to calculate the bridge requirements for the on-ramp process,
 * get quote and function to retry fetching the quote.
 */
export const useBridgeRequirementsQuery = (onRampChainId: EvmChainId) => {
  const { selectedAgentConfig } = useServices();
  const { isOnRampingTransactionSuccessful } = useOnRampContext();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  // State to control the force update of the bridge_refill_requirements API call
  // This is used when the user clicks on "Try again" button.
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [
    isBridgeRefillRequirementsApiLoading,
    setIsBridgeRefillRequirementsApiLoading,
  ] = useState(true);
  const [
    canPollForBridgeRefillRequirements,
    setCanPollForBridgeRefillRequirements,
  ] = useState(true);
  const [isManuallyRefetching, setIsManuallyRefetching] = useState(false);

  const getBridgeRequirementsParams = useGetBridgeRequirementsParams(
    onRampChainId,
    AddressZero,
  );

  const bridgeParams = useMemo(() => {
    if (!getBridgeRequirementsParams) return null;
    return getBridgeRequirementsParams(isForceUpdate);
  }, [isForceUpdate, getBridgeRequirementsParams]);

  const canIgnoreNativeToken =
    selectedAgentConfig.evmHomeChainId === onRampChainId;

  const bridgeParamsExceptNativeToken = useMemo(() => {
    if (!bridgeParams) return null;

    const bridgeRequest = canIgnoreNativeToken
      ? bridgeParams.bridge_requests.filter(
          (request) => request.to.token !== AddressZero,
        )
      : bridgeParams.bridge_requests;
    return { ...bridgeParams, bridge_requests: bridgeRequest };
  }, [bridgeParams, canIgnoreNativeToken]);

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirements(
    bridgeParamsExceptNativeToken,
    canPollForBridgeRefillRequirements && !isOnRampingTransactionSuccessful,
  );

  // fetch bridge refill requirements manually on mount
  useEffect(() => {
    if (!isBridgeRefillRequirementsApiLoading) return;

    refetchBridgeRefillRequirements().finally(() => {
      setIsBridgeRefillRequirementsApiLoading(false);
    });
  }, [
    isBridgeRefillRequirementsApiLoading,
    refetchBridgeRefillRequirements,
    setIsBridgeRefillRequirementsApiLoading,
  ]);

  const isLoading =
    isBalancesAndFundingRequirementsLoading ||
    isBridgeRefillRequirementsLoading ||
    isBridgeRefillRequirementsApiLoading ||
    isManuallyRefetching;

  const hasAnyQuoteFailed = useMemo(() => {
    if (!bridgeFundingRequirements) return false;
    return bridgeFundingRequirements.bridge_request_status.some(
      ({ status }) => status === 'QUOTE_FAILED',
    );
  }, [bridgeFundingRequirements]);

  const receivingTokens = useMemo(() => {
    if (!bridgeParams) return [];

    const toChainId = asEvmChainId(selectedAgentConfig.middlewareHomeChainId);
    const toChainConfig = TOKEN_CONFIG[toChainId];

    return bridgeParams.bridge_requests.map((request) => {
      const { token: toToken, amount } = request.to;
      const token = getTokenDetails(toToken, toChainConfig);
      return {
        amount: formatUnitsToNumber(amount, token?.decimals),
        symbol: token?.symbol as TokenSymbol,
      };
    });
  }, [bridgeParams, selectedAgentConfig.middlewareHomeChainId]);

  /**
   * List of tokens to bridge, excluding the native token, if onRampChainId
   * matches the middleware home chain.
   *
   * For example,
   * - Optimus, tokens to bridge: [USDC, OLAS]
   * - Gnosis, tokens to bridge: [ETH, USDC, OLAS]
   */
  const tokensToBeBridged = useMemo(() => {
    if (receivingTokens.length === 0) return [];

    const currentChainSymbol = asEvmChainDetails(
      selectedAgentConfig.middlewareHomeChainId,
    ).symbol;

    if (!canIgnoreNativeToken) {
      return receivingTokens.map((token) => token.symbol);
    }

    const filteredTokens = receivingTokens.filter(
      (token) => token.symbol !== currentChainSymbol,
    );
    return filteredTokens.map((token) => token.symbol);
  }, [
    selectedAgentConfig.middlewareHomeChainId,
    canIgnoreNativeToken,
    receivingTokens,
  ]);

  // Retry to fetch the bridge refill requirements
  const onRetry = useCallback(async () => {
    setIsForceUpdate(true);
    setIsManuallyRefetching(true);
    setCanPollForBridgeRefillRequirements(false);

    // slight delay before refetching.
    await delayInSeconds(1);

    refetchBridgeRefillRequirements()
      .then(() => {
        // force_update: true is used only when the user clicks on "Try again",
        // hence reset it to false after the API call is made.
        setIsForceUpdate(false);
        // allow polling for bridge refill requirements again, once successful.
        setCanPollForBridgeRefillRequirements(true);
      })
      .finally(() => {
        setIsManuallyRefetching(false);
      });
  }, [refetchBridgeRefillRequirements]);

  return {
    isLoading,
    hasError: isBridgeRefillRequirementsError || hasAnyQuoteFailed,
    bridgeParams,
    bridgeFundingRequirements,
    receivingTokens,
    tokensToBeBridged,
    onRetry,
  };
};
