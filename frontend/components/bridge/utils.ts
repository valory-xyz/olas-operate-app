import { isAddress } from 'ethers/lib/utils';
import { useCallback } from 'react';

import {
  AddressBalanceRecord,
  MasterSafeBalanceRecord,
  MiddlewareChain,
} from '@/client';
import {
  ChainTokenConfig,
  ETHEREUM_TOKEN_CONFIG,
  TOKEN_CONFIG,
} from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { areAddressesEqual } from '@/utils/address';
import { bigintMax } from '@/utils/calculations';
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

  return fromChainConfig[tokenSymbol].address as Address;
};

/**
 *
 * @warning a hook that should never exist. TODO: move this logic to backend
 * @deprecated This hook is planned for removal in future versions.
 *
 * Hook to return the updated bridge requirements params
 *
 * Request quote with formula (will be moved to backend):
 *   max(refill_requirement_masterSafe, monthly_gas_estimate) + refill_requirements_masterEOA
 *
 */
const useGetUpdatedBridgeRequirementsParams = () => {
  const { selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();
  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;

  return useCallback(
    (bridgeRequests: BridgeRefillRequirementsRequest['bridge_requests']) => {
      if (isBalancesAndFundingRequirementsLoading) return;
      if (!refillRequirements) return;
      if (!masterEoa?.address) return;

      const zeroAddressIndex = bridgeRequests.findIndex((req) =>
        areAddressesEqual(req.from.token, AddressZero),
      );
      const zeroAddressBridgeRequest =
        zeroAddressIndex !== -1 ? bridgeRequests[zeroAddressIndex] : null;
      if (!zeroAddressBridgeRequest) return;

      const masterEoaRequirementAmount = (
        refillRequirements as AddressBalanceRecord
      )[masterEoa?.address as Address][AddressZero];
      const safeRequirementAmount = (
        refillRequirements as MasterSafeBalanceRecord
      )['master_safe'][AddressZero];
      const monthlyGasEstimate = SERVICE_TEMPLATES.find(
        (template) => template.home_chain === toMiddlewareChain,
      )?.configurations[toMiddlewareChain].monthly_gas_estimate;
      const amount =
        bigintMax(
          BigInt(safeRequirementAmount),
          BigInt(monthlyGasEstimate || 0),
        ) + BigInt(masterEoaRequirementAmount);

      bridgeRequests[zeroAddressIndex].to.amount = amount.toString();

      return bridgeRequests;
    },
    [
      masterEoa,
      refillRequirements,
      toMiddlewareChain,
      isBalancesAndFundingRequirementsLoading,
    ],
  );
};

/**
 * Helper to get bridge refill requirements parameters
 * based on current refill requirements
 */
export const useGetBridgeRequirementsParams = () => {
  const { selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();
  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const getUpdatedBridgeRequirementsParams =
    useGetUpdatedBridgeRequirementsParams();

  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const fromAddress = masterEoa?.address;
  const toAddress = masterEoa?.address;

  return useCallback(
    (isForceUpdate = false) => {
      if (isBalancesAndFundingRequirementsLoading) return null;
      if (!refillRequirements) return null;
      if (!fromAddress || !toAddress) return null;

      const fromChainConfig = ETHEREUM_TOKEN_CONFIG; // TODO: make dynamic, get from token config
      const toChainConfig = TOKEN_CONFIG[asEvmChainId(toMiddlewareChain)];

      const bridgeRequests: BridgeRefillRequirementsRequest['bridge_requests'] =
        [];

      const tokensRefillList = Object.entries(refillRequirements);

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

      return {
        bridge_requests:
          getUpdatedBridgeRequirementsParams(bridgeRequests) || bridgeRequests,
        force_update: isForceUpdate,
      } satisfies BridgeRefillRequirementsRequest;
    },
    [
      fromAddress,
      toAddress,
      refillRequirements,
      isBalancesAndFundingRequirementsLoading,
      toMiddlewareChain,
      getUpdatedBridgeRequirementsParams,
    ],
  );
};
