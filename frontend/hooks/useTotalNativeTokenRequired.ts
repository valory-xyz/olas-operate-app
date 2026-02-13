import { useEffect, useMemo } from 'react';

import { GetOnRampRequirementsParams } from '@/components/OnRamp/types';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useBridgeRequirementsQuery } from '../components/OnRamp/PayingReceivingTable/useBridgeRequirementsQuery';

/**
 * Hook to fetch the bridge refill requirements for the on-ramp process and
 * calculate the total native token required for the bridge.
 *
 * Example: For Optimus, we require 0.01 ETH, 16 USDC, 100 OLAS.
 * So, total ETH required = 0.01 ETH + 16 USDC in ETH + 100 OLAS in ETH.
 *
 * @param onRampChainId - The chain ID where on-ramping occurs
 * @param toChainId - The destination chain ID where funds will be sent
 * @param getOnRampRequirementsParams - Function to get on-ramp requirements
 * @param queryKey - Query key suffix for caching
 */
export const useTotalNativeTokenRequired = (
  onRampChainId: EvmChainId,
  toChainId: EvmChainId,
  getOnRampRequirementsParams: GetOnRampRequirementsParams,
  queryKey: 'preview' | 'onboard' | 'deposit' = 'onboard',
) => {
  const {
    updateNativeAmountToPay,
    updateNativeTotalAmountRequired,
    isOnRampingTransactionSuccessful,
  } = useOnRampContext();
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
    getOnRampRequirementsParams,
    enabled: !isOnRampingTransactionSuccessful,
    stopPollingCondition: isOnRampingTransactionSuccessful,
    queryKeySuffix: queryKey,
  });

  console.log(
    'bridgeParams',
    bridgeParams,
    'isOnRampingTransactionSuccessful',
    isOnRampingTransactionSuccessful,
  );

  /**
   * Calculates the total native token required for the bridge.
   *
   * Example: for Optimus, we require 0.01 ETH, 16 USDC, 100 OLAS.
   * - OLAS_in_ETH = 16 USDC bridged to ETH
   * - USDC_in_ETH = 100 OLAS bridged to ETH
   * Total native token required = 0.01 ETH + OLAS_in_ETH + USDC_in_ETH
   */
  const totalNativeTokens = useMemo(() => {
    if (!bridgeParams) return;
    if (!bridgeFundingRequirements) return;
    if (!masterEoa?.address) return;
    if (!isMasterWalletFetched) return;

    // "FROM" chain - where we will on-ramp funds (source)
    const onRampNetworkName = asMiddlewareChain(onRampChainId);
    const destinationAddress =
      getMasterSafeOf?.(onRampChainId)?.address || masterEoa.address;

    // "TO" chain - where we will send the on-ramped funds (destination)
    const toChainName = asMiddlewareChain(toChainId);

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
      toChainName === onRampNetworkName ? nativeTokenAmount : 0;

    // Remaining token from the bridge quote.
    // e.g, For optimus, OLAS and USDC are bridged to ETH
    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[onRampNetworkName];
    const nativeBridgeRefillRequirements =
      bridgeRefillRequirements?.[destinationAddress]?.[AddressZero];
    // Existing balance of native token on the source chain will be also used for bridging
    const bridgeBalance = bridgeFundingRequirements.balances[onRampNetworkName];
    const nativeBalance = bridgeBalance?.[destinationAddress]?.[AddressZero];

    if (!nativeBridgeRefillRequirements) return;

    // e.g, For optimus, addition of (ETH required) + (OLAS and USDC bridged to ETH)
    // + existing balance in case we already have another agent on this chain
    const totalNativeTokenToPay =
      BigInt(nativeBridgeRefillRequirements) +
      BigInt(nativeTokenFromBridgeParams || 0);
    // All the above + existing balance in case we already have another agent on this chain
    // and some native tokens are there
    const totalNativeTokenRequired =
      totalNativeTokenToPay + BigInt(nativeBalance || 0);

    return {
      totalNativeTokenToPay: totalNativeTokenToPay
        ? formatUnitsToNumber(totalNativeTokenToPay, 18)
        : 0,
      totalNativeTokenRequired: totalNativeTokenRequired
        ? formatUnitsToNumber(totalNativeTokenRequired, 18)
        : 0,
    };
  }, [
    bridgeParams,
    bridgeFundingRequirements,
    masterEoa,
    isMasterWalletFetched,
    onRampChainId,
    toChainId,
    getMasterSafeOf,
  ]);

  console.log(
    'totalNativeTokens',
    totalNativeTokens,
    'bridgeFundingRequirements',
    bridgeFundingRequirements,
  );

  // Update the ETH amount to pay in the on-ramp context
  useEffect(() => {
    if (!totalNativeTokens) return;
    if (isOnRampingTransactionSuccessful) return;

    updateNativeAmountToPay(totalNativeTokens.totalNativeTokenToPay);
    updateNativeTotalAmountRequired(totalNativeTokens.totalNativeTokenRequired);
  }, [
    isOnRampingTransactionSuccessful,
    updateNativeAmountToPay,
    totalNativeTokens,
    updateNativeTotalAmountRequired,
  ]);

  return {
    isLoading,
    hasError,
    totalNativeToken: totalNativeTokens?.totalNativeTokenToPay ?? 0,
    receivingTokens,
    onRetry,
  };
};
