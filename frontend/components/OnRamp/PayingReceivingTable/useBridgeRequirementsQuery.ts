import { useCallback, useEffect, useMemo, useState } from 'react';

import { THIRTY_SECONDS_INTERVAL } from '@/constants';
import { EvmChainId } from '@/constants/chains';
import {
  useBalanceAndRefillRequirementsContext,
  useBridgeRefillRequirements,
} from '@/hooks';
import { delayInSeconds } from '@/utils/delay';

import { useBridgeRequirementsUtils } from '../hooks/useBridgeRequirementsUtils';
import { GetOnRampRequirementsParams } from '../types';

type UseBridgeRequirementsQueryParams = {
  onRampChainId: EvmChainId;
  getOnRampRequirementsParams: GetOnRampRequirementsParams;
  enabled: boolean;
  stopPollingCondition: boolean;
  queryKeySuffix?: string;
};

/**
 * Hook to calculate the bridge requirements for the on-ramp process,
 * get quote and function to retry fetching the quote.
 */
export const useBridgeRequirementsQuery = ({
  onRampChainId,
  getOnRampRequirementsParams,
  enabled = true,
  stopPollingCondition,
  queryKeySuffix,
}: UseBridgeRequirementsQueryParams) => {
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const {
    getReceivingTokens,
    getTokensToBeBridged,
    getBridgeParamsExceptNativeToken,
  } = useBridgeRequirementsUtils(onRampChainId);

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
  ] = useState(enabled);
  const [isManuallyRefetching, setIsManuallyRefetching] = useState(false);

  const bridgeParams = useMemo(() => {
    if (!getOnRampRequirementsParams) return null;
    return getOnRampRequirementsParams(isForceUpdate);
  }, [isForceUpdate, getOnRampRequirementsParams]);

  const bridgeParamsExceptNativeToken = useMemo(
    () => getBridgeParamsExceptNativeToken(bridgeParams),
    [getBridgeParamsExceptNativeToken, bridgeParams],
  );

  const {
    data: bridgeFundingRequirements,
    isLoading: isBridgeRefillRequirementsLoading,
    isError: isBridgeRefillRequirementsError,
    refetch: refetchBridgeRefillRequirements,
  } = useBridgeRefillRequirements(
    bridgeParamsExceptNativeToken,
    canPollForBridgeRefillRequirements && !stopPollingCondition,
    enabled,
    queryKeySuffix,
    THIRTY_SECONDS_INTERVAL,
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

  const receivingTokens = useMemo(
    () => getReceivingTokens(bridgeParams),
    [getReceivingTokens, bridgeParams],
  );
  const tokensToBeBridged = useMemo(
    () => getTokensToBeBridged(receivingTokens),
    [getTokensToBeBridged, receivingTokens],
  );

  // Retry to fetch the bridge refill requirements
  const onRetry = useCallback(async () => {
    setIsForceUpdate(true);
    setIsManuallyRefetching(true);
    setCanPollForBridgeRefillRequirements(false);

    await delayInSeconds(1); // slight delay before refetching.

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
