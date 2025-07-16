import { useCallback, useMemo, useState } from 'react';

import { getTokenDetails } from '@/components/Bridge/utils';
import { TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBridgeRefillRequirements } from '@/hooks/useBridgeRefillRequirements';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { delayInSeconds } from '@/utils/delay';
import { asEvmChainId, asMiddlewareChain } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useGetBridgeRequirementsParams } from '../../hooks/useGetBridgeRequirementsParams';
import { onRampChainMap } from '../constants';

export const useTotalNativeTokenRequired = () => {
  const { selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();
  const { isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
  const toChainId = asEvmChainId(selectedAgentConfig.middlewareHomeChainId);
  const fromChainId = onRampChainMap[fromChainName];
  const toChainConfig = TOKEN_CONFIG[toChainId];

  // State to control the force update of the bridge_refill_requirements API call
  // This is used when the user clicks on "Try again" button.
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [
    canPollForBridgeRefillRequirements,
    setCanPollForBridgeRefillRequirements,
  ] = useState(true);
  const [isManuallyRefetching, setIsManuallyRefetching] = useState(false);

  const getBridgeRequirementsParams = useGetBridgeRequirementsParams(
    fromChainId,
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
    canPollForBridgeRefillRequirements,
  );

  // Calculate the total native token required for the bridge.
  // Example: for Optimus, we require 0.01 ETH, 16 USDC, 100 OLAS
  // olas_in_eth = 16 USDC bridged to ETH
  // usdc_in_eth = 100 OLAS bridged to ETH
  // Total native token required = 0.01 ETH + olas_in_eth + usdc_in_eth
  const totalNativeTokenRequired = useMemo(() => {
    if (!bridgeParams) return;
    if (!bridgeFundingRequirements) return;
    if (!masterEoa?.address) return;

    const currentNativeToken = bridgeParams.bridge_requests.find(
      (request) => request.to.token === AddressZero,
    )?.to.amount;

    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[fromChainName]?.[
        masterEoa.address
      ];
    const nativeTokenToBridge = bridgeRefillRequirements?.[AddressZero];
    if (!nativeTokenToBridge) return;

    return BigInt(nativeTokenToBridge) + BigInt(currentNativeToken || 0);
  }, [
    bridgeParams,
    bridgeFundingRequirements,
    masterEoa?.address,
    fromChainName,
  ]);

  const receivingTokens = useMemo(() => {
    if (!bridgeParams) return [];

    return bridgeParams.bridge_requests.map((request) => {
      const toToken = request.to.token;
      const amount = request.to.amount;
      const token = getTokenDetails(toToken, toChainConfig);
      return {
        amount: formatUnitsToNumber(amount, token?.decimals),
        symbol: token?.symbol,
      };
    });
  }, [bridgeParams, toChainConfig]);

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
    isManuallyRefetching;

  const hasAnyQuoteFailed = useMemo(() => {
    if (!bridgeFundingRequirements) return false;

    return bridgeFundingRequirements.bridge_request_status.some(
      ({ status }) => status === 'QUOTE_FAILED',
    );
  }, [bridgeFundingRequirements]);

  const totalNativeToken = totalNativeTokenRequired
    ? formatUnitsToNumber(totalNativeTokenRequired, 18)
    : 0;

  return {
    isLoading,
    hasError: isBridgeRefillRequirementsError || hasAnyQuoteFailed,
    totalNativeToken,
    receivingTokens,
    onRetry,
  };
};
