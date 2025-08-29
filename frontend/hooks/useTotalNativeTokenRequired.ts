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
export const useTotalNativeTokenRequired = (onRampChainId: EvmChainId) => {
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
  } = useBridgeRequirementsQuery(
    onRampChainId,
    !isOnRampingTransactionSuccessful,
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
  const totalNativeToken = useMemo(() => {
    if (!bridgeParams) return;
    if (!bridgeFundingRequirements) return;
    if (!masterEoa?.address) return;

    const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
    const toOnRampNetworkName = asMiddlewareChain(
      onRampChainMap[fromChainName],
    );

    // Native token from the bridge params (ie, refill requirements).
    const nativeTokenFromBridgeParams = bridgeParams.bridge_requests.find(
      (request) => request.to.token === AddressZero,
    )?.to.amount;

    // Remaining native token from the bridge quote.
    // e.g, For optimus, OLAS and USDC are bridged to ETH
    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[toOnRampNetworkName];
    const nativeTokenFromBridgeQuote =
      bridgeRefillRequirements?.[masterEoa.address]?.[AddressZero];

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
    masterEoa?.address,
    selectedAgentConfig.evmHomeChainId,
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
