import { isAddress } from 'ethers/lib/utils';

import { AddressBalanceRecord, MiddlewareChain } from '@/client';
import {
  ChainTokenConfig,
  ETHEREUM_TOKEN_CONFIG,
  TOKEN_CONFIG,
} from '@/config/tokens';
import { AddressZero } from '@/constants/address';
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

  const tokenSymbol = Object.values(toChainConfig).find(
    (configToken) =>
      configToken.address?.toLowerCase() === tokenAddress.toLowerCase(),
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
export const getBridgeRequirementsParams = ({
  toMiddlewareChain,
  fromAddress,
  toAddress,
  refillRequirements,
}: {
  toMiddlewareChain: MiddlewareChain;
  fromAddress: Address;
  toAddress: Address;
  refillRequirements: AddressBalanceRecord;
}) => {
  // TODO: make dynamic, get from token config
  const fromChainConfig = ETHEREUM_TOKEN_CONFIG;
  const toChainConfig = TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)];

  const bridgeRequests: BridgeRefillRequirementsRequest['bridge_requests'] = [];

  // Populate bridge requests from refill Requirements
  for (const [walletAddress, tokensWithRequirements] of Object.entries(
    refillRequirements,
  )) {
    // Only calculate the refill requirements from master EOA or master safe placeholder
    if (
      !(
        walletAddress.toLowerCase() === toAddress.toLowerCase() ||
        walletAddress === 'master_safe'
      )
    ) {
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
          from: { chain: fromChain, address: fromAddress, token: fromToken },
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
    force_update: false,
  };
};
