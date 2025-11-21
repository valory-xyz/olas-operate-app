import { isAddress } from 'ethers/lib/utils';
import { useCallback } from 'react';

import { getFromToken } from '@/components/Bridge/utils';
import { ETHEREUM_TOKEN_CONFIG, TOKEN_CONFIG } from '@/config/tokens';
import { AllEvmChainId, AllEvmChainIdMap, EvmChainId } from '@/constants';
import {
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
  useServices,
} from '@/hooks';
import { Address, BridgeRefillRequirementsRequest } from '@/types';
import { areAddressesEqual, asAllMiddlewareChain, asEvmChainId } from '@/utils';

/**
 * @returns A function that returns the bridge refill requirements parameters
 * based on the current refill requirements OR null if requirements are not available/loading.
 */
export const useGetBridgeRequirementsParams = (
  fromChainId: AllEvmChainId,
  defaultFromToken?: Address,
) => {
  const { selectedAgentConfig } = useServices();
  const { masterEoa, getMasterSafeOf } = useMasterWalletContext();
  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  const fromChainConfig =
    fromChainId === AllEvmChainIdMap.Ethereum
      ? ETHEREUM_TOKEN_CONFIG
      : TOKEN_CONFIG[fromChainId as EvmChainId];
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;

  // Check if master safe exists on fromChainId, use it if available, otherwise use masterEoa
  const existingMasterSafeOnFromChain = getMasterSafeOf?.(
    fromChainId as EvmChainId,
  );
  const fromAddress =
    existingMasterSafeOnFromChain?.address || masterEoa?.address;
  const toAddress = masterEoa?.address;

  return useCallback(
    (isForceUpdate = false) => {
      if (isBalancesAndFundingRequirementsLoading) return null;
      if (!refillRequirements) return null;
      if (!fromAddress || !toAddress) return null;

      const toChainConfig = TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)];

      const tokensRefillList = Object.entries(refillRequirements);
      const bridgeRequests: BridgeRefillRequirementsRequest['bridge_requests'] =
        [];

      // Populate bridge requests from refill Requirements
      for (const [walletAddress, tokensWithRequirements] of tokensRefillList) {
        // Only calculate the refill requirements from master EOA or master safe placeholder
        const isRecipientAddress = areAddressesEqual(walletAddress, toAddress);
        if (!(isRecipientAddress || walletAddress === 'master_safe')) {
          continue;
        }

        for (const [tokenAddress, amount] of Object.entries(
          tokensWithRequirements,
        )) {
          if (!isAddress(tokenAddress)) continue;

          const fromToken =
            defaultFromToken ||
            getFromToken(tokenAddress, fromChainConfig, toChainConfig);

          const fromChain = asAllMiddlewareChain(fromChainId);
          const toChain = toMiddlewareChain;
          const toToken = tokenAddress as Address;

          const existingRequest = bridgeRequests.find(
            (req) =>
              req.from.chain === fromChain &&
              req.to.chain === toChain &&
              areAddressesEqual(req.from.address, fromAddress) &&
              areAddressesEqual(req.to.address, toAddress) &&
              areAddressesEqual(req.from.token, fromToken) &&
              areAddressesEqual(req.to.token, toToken),
          );

          if (existingRequest) {
            // If the request already exists, update the amount
            const toAmount = BigInt(existingRequest.to.amount) + BigInt(amount);
            existingRequest.to.amount = toAmount.toString();
          } else {
            bridgeRequests.push({
              from: {
                chain: fromChain,
                address: fromAddress,
                token: fromToken,
              },
              to: {
                chain: toChain,
                address: toAddress,
                token: toToken,
                amount: `${amount}`,
              },
            });
          }
        }
      }

      const request: BridgeRefillRequirementsRequest = {
        bridge_requests: bridgeRequests,
        force_update: isForceUpdate,
      };
      return request;
    },
    [
      fromAddress,
      toAddress,
      fromChainConfig,
      refillRequirements,
      fromChainId,
      defaultFromToken,
      isBalancesAndFundingRequirementsLoading,
      toMiddlewareChain,
    ],
  );
};
