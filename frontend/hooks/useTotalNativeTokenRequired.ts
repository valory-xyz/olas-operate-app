import { useEffect, useMemo } from 'react';

import { useBridgeRequirementsQuery } from '@/components/SetupOnRamp/PayingReceivingTable/useBridgeRequirementsQuery';
import { AddressZero } from '@/constants/address';
import { EvmChainId, onRampChainMap } from '@/constants/chains';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

/**
 * Hook to fetch the bridge refill requirements for the on-ramp process and
 * calculate the total native token required for the bridge.
 *
 * Example: For Optimus, we require 0.01 ETH, 16 USDC, 100 OLAS.
 * So, total ETH required = 0.01 ETH + 16 USDC in ETH + 100 OLAS in ETH.
 *
 */
export const useTotalNativeTokenRequired = (
  onRampChainId: EvmChainId,
  queryKey: 'preview' | 'onboarding' | string = 'onboarding',
  customGetBridgeRequirementsParams?: (
    isForceUpdate?: boolean,
  ) => BridgeRefillRequirementsRequest | null,
) => {
  const { updateEthAmountToPay, isOnRampingTransactionSuccessful } =
    useOnRampContext();
  const { selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();

  const {
    isLoading,
    hasError,
    bridgeParams,
    bridgeFundingRequirements,
    receivingTokens,
    onRetry,
  } = useBridgeRequirementsQuery({
    onRampChainId,
    enabled: !isOnRampingTransactionSuccessful,
    stopPollingCondition: isOnRampingTransactionSuccessful,
    queryKeySuffix: queryKey,
    customGetBridgeRequirementsParams,
  });

  /**
   * Calculates the total native token required for the bridge.
   *
   * Example: for Optimus, we require 0.01 ETH, 16 USDC, 100 OLAS.
   * - OLAS_in_ETH = 16 USDC bridged to ETH
   * - USDC_in_ETH = 100 OLAS bridged to ETH
   * Total native token required = 0.01 ETH + OLAS_in_ETH + USDC_in_ETH
   */
  const totalNativeToken = useMemo(() => {
    if (!bridgeParams) return;
    if (!bridgeFundingRequirements) return;
    if (!masterEoa?.address) return;

    const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
    const toOnRampNetworkName = asMiddlewareChain(
      onRampChainMap[fromChainName],
    );
    const onRampNetworkName = asMiddlewareChain(onRampChainId);

    /**
     * Calculate native token amount needed from direct requirements (not from bridging)
     *
     * When the source chain (where user is on-ramping) matches the destination chain:
     *   - We need to include the native token amount in our total calculation.
     *   - This amount won't go through bridging since it's already on the correct chain.
     *
     * Example: For Optimus on Optimism
     *   - We need 0.01 ETH for agent operation.
     *   - Since on-ramping is already on Optimism, this ETH will be directly funded.
     *   - We add this to our total required amount (separate from bridge calculations)
     */
    const nativeTokenAmount = bridgeParams.bridge_requests.find(
      (request) => request.to.token === AddressZero,
    )?.to.amount;
    const nativeTokenFromBridgeParams =
      fromChainName === toOnRampNetworkName ? nativeTokenAmount : 0;

    // For cross-chain bridging, check the source chain of bridge requests
    // For deposit flow, bridge requests are from on-ramp chain (Base) to wallet chain (Gnosis)
    // Use the on-ramp chain directly (where ETH will be purchased via Transak)
    const sourceChainName =
      bridgeParams.bridge_requests.length > 0
        ? bridgeParams.bridge_requests[0].from.chain
        : onRampNetworkName;

    // Look for native token requirement on the on-ramp chain (where ETH will be purchased)
    const chainToCheck =
      sourceChainName || onRampNetworkName || toOnRampNetworkName;

    // Remaining token from the bridge quote.
    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[chainToCheck];
    const bridgeRefillRecord = bridgeRefillRequirements as
      | Record<string, Record<string, string | number>>
      | undefined;
    const nativeTokenFromBridgeQuote =
      bridgeRefillRecord?.[masterEoa.address]?.[AddressZero] ||
      bridgeRefillRecord?.['master_safe']?.[AddressZero];

    let finalNativeTokenAmount = nativeTokenFromBridgeQuote;
    if (!finalNativeTokenAmount) {
      const bridgeTotalRequirements =
        bridgeFundingRequirements.bridge_total_requirements[chainToCheck];
      const bridgeTotalRecord = bridgeTotalRequirements as
        | Record<string, Record<string, string | number>>
        | undefined;
      const nativeTokenFromTotalRequirements =
        bridgeTotalRecord?.[masterEoa.address]?.[AddressZero] ||
        bridgeTotalRecord?.['master_safe']?.[AddressZero];

      if (nativeTokenFromTotalRequirements) {
        finalNativeTokenAmount = nativeTokenFromTotalRequirements;
      }
    }

    if (!finalNativeTokenAmount) {
      if (bridgeParams.bridge_requests.length > 0) return;
      return 0;
    }

    // e.g, For optimus, addition of (ETH required) + (OLAS and USDC bridged to ETH).
    // For PredictTrader, this is ETH on Base needed to bridge to tokens on Gnosis.
    const totalNativeTokenRequired =
      BigInt(finalNativeTokenAmount) + BigInt(nativeTokenFromBridgeParams || 0);

    return totalNativeTokenRequired
      ? formatUnitsToNumber(totalNativeTokenRequired, 18)
      : 0;
  }, [
    bridgeParams,
    bridgeFundingRequirements,
    masterEoa?.address,
    selectedAgentConfig.evmHomeChainId,
    onRampChainId,
  ]);

  // Update the ETH amount to pay in the on-ramp context
  useEffect(() => {
    if (!totalNativeToken) return;
    if (isOnRampingTransactionSuccessful) return;

    updateEthAmountToPay(totalNativeToken);
  }, [
    totalNativeToken,
    isOnRampingTransactionSuccessful,
    updateEthAmountToPay,
  ]);

  return {
    isLoading,
    hasError,
    totalNativeToken,
    receivingTokens,
    onRetry,
  };
};
