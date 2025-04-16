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
import { Optional } from '@/types/Util';
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
 * Helper to add or update a bridge request
 */
const upsertBridgeRequest = ({
  bridgeRequests,
  fromChain,
  toChain,
  fromAddress,
  toAddress,
  fromToken,
  toToken,
  amount,
}: {
  bridgeRequests: BridgeRefillRequirementsRequest['bridge_requests'];
  fromChain: MiddlewareChain;
  toChain: MiddlewareChain;
  fromAddress: Address;
  toAddress: Address;
  fromToken: Address;
  toToken: Address;
  amount: string;
}) => {
  const existing = bridgeRequests.find(
    (req) =>
      req.from.chain === fromChain &&
      req.to.chain === toChain &&
      req.from.address.toLowerCase() === fromAddress.toLowerCase() &&
      req.to.address.toLowerCase() === toAddress.toLowerCase() &&
      req.from.token.toLowerCase() === fromToken.toLowerCase() &&
      req.to.token.toLowerCase() === toToken.toLowerCase(),
  );

  if (existing) {
    existing.to.amount = (
      BigInt(existing.to.amount) + BigInt(amount)
    ).toString();
  } else {
    bridgeRequests.push({
      from: { chain: fromChain, address: fromAddress, token: fromToken },
      to: { chain: toChain, address: toAddress, token: toToken, amount },
    });
  }
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
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  refillRequirements: Optional<AddressBalanceRecord>;
}) => {
  // TODO: make dynamic, get from token config
  const fromChainConfig = ETHEREUM_TOKEN_CONFIG;
  const toChainConfig = TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)];

  const bridgeRequests: BridgeRefillRequirementsRequest['bridge_requests'] = [];

  // Populate bridge requests from refill Requirements
  if (refillRequirements) {
    for (const [walletAddress, tokens] of Object.entries(refillRequirements)) {
      // Only calculate the refill requirements from master EOA or master safe placeholder
      if (
        !(
          walletAddress.toLowerCase() === toAddress.toLowerCase() ||
          walletAddress === 'master_safe'
        )
      ) {
        continue;
      }

      for (const [tokenAddress, amount] of Object.entries(tokens)) {
        if (!isAddress(tokenAddress)) continue;

        const fromToken = getFromToken(
          tokenAddress,
          fromChainConfig,
          toChainConfig,
        );

        upsertBridgeRequest({
          bridgeRequests,
          fromChain: MiddlewareChain.ETHEREUM,
          toChain: toMiddlewareChain,
          fromAddress,
          toAddress,
          fromToken,
          toToken: tokenAddress as Address,
          amount: `${amount}`,
        });
      }
    }
  }

  return {
    bridge_requests: bridgeRequests,
    force_update: false,
  };
};
