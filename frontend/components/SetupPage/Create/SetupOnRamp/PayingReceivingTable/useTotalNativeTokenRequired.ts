import { useEffect, useMemo } from 'react';

import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { useOnRampContext } from '@/hooks/useOnRampContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useBridgeRequirementsQuery } from '../hooks/useBridgeRequirementsQuery';

/**
 * Hook to fetch the bridge refill requirements for the on-ramp process and
 * calculate the total native token required for the bridge.
 *
 * Example: For Optimus, we require 0.01 ETH, 16 USDC, 100 OLAS.
 * So, total ETH required = 0.01 ETH + 16 USDC in ETH + 100 OLAS in ETH.
 *
 */
export const useTotalNativeTokenRequired = (onRampChainId: EvmChainId) => {
  const { selectedAgentConfig } = useServices();
  const { updateEthAmountToPay, isOnRampingTransactionSuccessful } =
    useOnRampContext();
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
   * olas_in_eth = 16 USDC bridged to ETH
   * usdc_in_eth = 100 OLAS bridged to ETH
   * Total native token required = 0.01 ETH + olas_in_eth + usdc_in_eth
   *
   */
  const totalNativeToken = useMemo(() => {
    if (!bridgeParams) return;
    if (!bridgeFundingRequirements) return;
    if (!masterEoa?.address) return;

    const fromChainName = asMiddlewareChain(selectedAgentConfig.evmHomeChainId);
    const nativeTokeFromBridgeParams = bridgeParams.bridge_requests.find(
      (request) => request.to.token === AddressZero,
    )?.to.amount;

    const bridgeRefillRequirements =
      bridgeFundingRequirements.bridge_refill_requirements[fromChainName];
    const masterEoaRequirements = bridgeRefillRequirements?.[masterEoa.address];
    const nativeTokenFromBridgeQuote = masterEoaRequirements?.[AddressZero];
    if (!nativeTokenFromBridgeQuote) return;

    const totalNativeTokenRequired =
      BigInt(nativeTokenFromBridgeQuote) +
      BigInt(nativeTokeFromBridgeParams || 0);

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
