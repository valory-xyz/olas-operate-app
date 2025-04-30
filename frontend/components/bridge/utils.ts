import { isAddress } from 'ethers/lib/utils';
import { useCallback } from 'react';

import { MiddlewareChain } from '@/client';
import {
  ChainTokenConfig,
  ETHEREUM_TOKEN_CONFIG,
  TOKEN_CONFIG,
} from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { areAddressesEqual } from '@/utils/address';
import { asEvmChainId } from '@/utils/middlewareHelpers';

/**
 * Helper to get source token address on the fromChain
 */
const getFromToken = (
  tokenAddress: string,
  fromChainConfig: ChainTokenConfig,
  toChainConfig: ChainTokenConfig,
): Address => {
  if (tokenAddress.toLowerCase() === AddressZero) {
    return AddressZero;
  }

  const tokenSymbol = Object.values(toChainConfig).find((configToken) =>
    areAddressesEqual(configToken.address!, tokenAddress),
  )?.symbol;

  if (!tokenSymbol || !fromChainConfig[tokenSymbol]?.address) {
    throw new Error(
      `Failed to get source token for the destination token: ${tokenAddress}`,
    );
  }

  return fromChainConfig[tokenSymbol].address;
};

/**
 * Helper to get bridge refill requirements parameters
 * based on current refill requirements
 */
export const useGetBridgeRequirementsParams = () => {
  const { selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();

  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const fromAddress = masterEoa?.address;
  const toAddress = masterEoa?.address;
  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  return useCallback(
    (isForceUpdate = false) => {
      if (isBalancesAndFundingRequirementsLoading) return null;
      if (!refillRequirements) return null;
      if (!fromAddress || !toAddress) return null;

      const fromChainConfig = ETHEREUM_TOKEN_CONFIG; // TODO: make dynamic, get from token config
      const toChainConfig = TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)];

      const bridgeRequests: BridgeRefillRequirementsRequest['bridge_requests'] =
        [];

      // Populate bridge requests from refill Requirements
      for (const [walletAddress, tokensWithRequirements] of Object.entries(
        refillRequirements,
      )) {
        // Only calculate the refill requirements from master EOA or master safe placeholder
        const isRecipientAddress = areAddressesEqual(walletAddress, toAddress);
        if (!(isRecipientAddress || walletAddress === 'master_safe')) {
          continue;
        }

        for (const [tokenAddress, amount] of Object.entries(
          tokensWithRequirements,
        )) {
          if (!isAddress(tokenAddress)) continue;

          const fromToken = getFromToken(
            tokenAddress,
            fromChainConfig,
            toChainConfig,
          );

          const fromChain = MiddlewareChain.ETHEREUM;
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
            existingRequest.to.amount = (
              BigInt(existingRequest.to.amount) + BigInt(amount)
            ).toString();
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

      return {
        bridge_requests: bridgeRequests,
        force_update: isForceUpdate,
      } satisfies BridgeRefillRequirementsRequest;
    },
    [
      fromAddress,
      toAddress,
      refillRequirements,
      isBalancesAndFundingRequirementsLoading,
      toMiddlewareChain,
    ],
  );
};
