import { useEffect, useMemo } from 'react';

import { AddressZero } from '@/constants/address';
import { EvmChainId, onRampChainMap } from '@/constants/chains';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useBridgeRequirementsQuery } from '../components/SetupPage/Create/SetupOnRamp/PayingReceivingTable/useBridgeRequirementsQuery';

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
  queryKey: 'preview' | 'onboarding' = 'onboarding',
) => {
  const { updateEthAmountToPay, isOnRampingTransactionSuccessful } =
    useOnRampContext();
  const { selectedAgentConfig } = useServices();
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletFetched,
  } = useMasterWalletContext();

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
    if (!isMasterWalletFetched) return;

    // "TO" chain, where we will bridge on-ramped funds to
    const agentChainName = asMiddlewareChain(
      selectedAgentConfig.evmHomeChainId,
    );
    // "FROM" chain for bridging, the chain we will on-ramp funds to
    const onRampNetworkName = asMiddlewareChain(onRampChainMap[agentChainName]);

    const destinationAddress =
      getMasterSafeOf?.(onRampChainMap[agentChainName])?.address ||
      masterEoa.address;

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
      agentChainName === onRampNetworkName ? nativeTokenAmount : 0;

    // Remaining token from the bridge quote.
    // e.g, For optimus, OLAS and USDC are bridged to ETH
    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[onRampNetworkName];
    const nativeTokenFromBridgeQuote =
      bridgeRefillRequirements?.[destinationAddress]?.[AddressZero];

    if (!nativeTokenFromBridgeQuote) return;

    // e.g, For optimus, addition of (ETH required) + (OLAS and USDC bridged to ETH).
    const totalNativeTokenRequired =
      BigInt(nativeTokenFromBridgeQuote) +
      BigInt(nativeTokenFromBridgeParams || 0);

    return totalNativeTokenRequired
      ? formatUnitsToNumber(totalNativeTokenRequired, 18)
      : 0;
  }, [
    bridgeParams,
    bridgeFundingRequirements,
    masterEoa,
    isMasterWalletFetched,
    selectedAgentConfig.evmHomeChainId,
    getMasterSafeOf,
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
