import { useCallback, useEffect, useMemo, useState } from 'react';

import { getTokenDetails } from '@/components/Bridge/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { delayInSeconds } from '@/utils/delay';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useGetBridgeRequirementsParams } from '../components/SetupPage/Create/hooks/useGetBridgeRequirementsParams';

// TODO: some of the logic can be reused with bridging

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

  const bridgeParamsExceptNativeToken = useMemo(() => {
    if (!bridgeParams) return null;

    return {
      ...bridgeParams,
      bridge_requests: bridgeParams.bridge_requests.filter(
        (request) => request.to.token !== AddressZero,
      ),
    };
  }, [bridgeParams]);

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

  const receivingTokens = useMemo(() => {
    if (!bridgeParams) return [];

    const toChainId = asEvmChainId(selectedAgentConfig.middlewareHomeChainId);
    const toChainConfig = TOKEN_CONFIG[toChainId];

    return bridgeParams.bridge_requests.map((request) => {
      const { token: toToken, amount } = request.to;
      const token = getTokenDetails(toToken, toChainConfig);
      return {
        amount: formatUnitsToNumber(amount, token?.decimals),
        symbol: token?.symbol,
      };
    });
  }, [bridgeParams, selectedAgentConfig.middlewareHomeChainId]);

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

  return {
    isLoading,
    hasError: isBridgeRefillRequirementsError || hasAnyQuoteFailed,
    receivingTokens,
    onRetry,
  };
};
