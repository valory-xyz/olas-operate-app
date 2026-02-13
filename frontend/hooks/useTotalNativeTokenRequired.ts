import { useEffect, useMemo, useRef } from 'react';

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
    isBuyCryptoBtnLoading,
  } = useOnRampContext();
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletFetched,
  } = useMasterWalletContext();

  // Ref to store frozen totalNativeTokens once step 1 completes
  // This prevents recalculation when bridge requirements update after onramping success
  const frozenTotalNativeTokensRef = useRef<{
    totalNativeTokenToPay: number;
    totalNativeTokenRequired: number;
  } | null>(null);

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
  const nativeTokenAmount = bridgeParams?.bridge_requests.find(
    (request) => request.to.token === AddressZero,
  )?.to.amount;

  /**
   * Calculates the total native token required for the bridge.
   *
   * Example: for Optimus, we require 0.01 ETH, 16 USDC, 100 OLAS.
   * - OLAS_in_ETH = 16 USDC bridged to ETH
   * - USDC_in_ETH = 100 OLAS bridged to ETH
   * Total native token required = 0.01 ETH + OLAS_in_ETH + USDC_in_ETH
   *
   * Note: Once step 1 (onramping) is complete, we freeze this calculation
   * to prevent redundant price-quote API calls from bridge requirement updates.
   */
  const shouldFreezeTotals =
    isBuyCryptoBtnLoading || isOnRampingTransactionSuccessful;

  const computedTotalNativeTokens = useMemo(() => {
    if (!bridgeFundingRequirements) return;
    if (!masterEoa?.address) return;
    if (!isMasterWalletFetched) return;

    // "FROM" chain - where we will on-ramp funds (source)
    const onRampNetworkName = asMiddlewareChain(onRampChainId);
    const destinationAddress =
      getMasterSafeOf?.(onRampChainId)?.address || masterEoa.address;

    // "TO" chain - where we will send the on-ramped funds (destination)
    const toChainName = asMiddlewareChain(toChainId);

    const nativeTokenFromBridgeParams =
      toChainName === onRampNetworkName ? nativeTokenAmount : 0;

    // Remaining token from the bridge quote.
    // e.g, For optimus, OLAS and USDC are bridged to ETH
    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[onRampNetworkName];
    const bridgeRefillRequirementsOfNonNativeTokens =
      bridgeRefillRequirements?.[destinationAddress]?.[AddressZero];
    // Existing balance of native token on the source chain will be also used for bridging
    const bridgeBalance = bridgeFundingRequirements.balances[onRampNetworkName];
    const nativeBalance = bridgeBalance?.[destinationAddress]?.[AddressZero];

    if (!bridgeRefillRequirementsOfNonNativeTokens) return;

    // e.g, For optimus, addition of (ETH required) + (OLAS and USDC bridged to ETH)
    // + existing balance in case we already have another agent on this chain
    const totalNativeTokenToPay =
      BigInt(bridgeRefillRequirementsOfNonNativeTokens) +
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
    nativeTokenAmount,
    bridgeFundingRequirements,
    masterEoa,
    isMasterWalletFetched,
    onRampChainId,
    toChainId,
    getMasterSafeOf,
  ]);

  const totalNativeTokens = useMemo(() => {
    if (shouldFreezeTotals && frozenTotalNativeTokensRef.current) {
      return frozenTotalNativeTokensRef.current;
    }
    return computedTotalNativeTokens;
  }, [computedTotalNativeTokens, shouldFreezeTotals]);

  // Freeze totals once the user initiates on-ramping or once it succeeds
  useEffect(() => {
    if (!shouldFreezeTotals) return;
    if (!computedTotalNativeTokens) return;
    if (frozenTotalNativeTokensRef.current) return;
    frozenTotalNativeTokensRef.current = computedTotalNativeTokens;
  }, [computedTotalNativeTokens, shouldFreezeTotals]);

  // Reset frozen ref when starting a new onramp flow
  useEffect(() => {
    if (!shouldFreezeTotals) {
      frozenTotalNativeTokensRef.current = null;
    }
  }, [shouldFreezeTotals]);

  // Update the ETH amount to pay in the on-ramp context
  useEffect(() => {
    if (!totalNativeTokens) return;
    if (shouldFreezeTotals) return;

    updateNativeAmountToPay(totalNativeTokens.totalNativeTokenToPay);
    updateNativeTotalAmountRequired(totalNativeTokens.totalNativeTokenRequired);
  }, [
    shouldFreezeTotals,
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
