import { isAddress } from 'ethers/lib/utils';
import { useCallback } from 'react';

import {
  AddressBalanceRecord,
  MasterSafeBalanceRecord,
  MiddlewareChain,
} from '@/client';
import { getFromToken } from '@/components/Bridge/utils';
import { ETHEREUM_TOKEN_CONFIG, TOKEN_CONFIG } from '@/config/tokens';
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
 *
 * @warning A HOOK THAT SHOULD NEVER EXIST.
 * @deprecated TODO: This hook is used because BE doesn't support monthly_gas_estimate in the refill requirements yet.
 * Remove the hook once it's supported
 *
 * Hook to return the updated bridge requirements params to improve the
 * initial funding requirements.
 *
 * Request quote with formula (will be moved to backend):
 *   max(refill_requirement_masterSafe, monthly_gas_estimate) + refill_requirements_masterEOA
 *
 */
const useGetBridgeRequirementsParamsWithMonthlyGasEstimate = () => {
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

      const nativeTokenIndex = bridgeRequests.findIndex((req) =>
        areAddressesEqual(req.from.token, AddressZero),
      );
      if (nativeTokenIndex === -1) return;

      // refill_requirements_masterEOA
      const masterEoaRequirementAmount = (
        refillRequirements as AddressBalanceRecord
      )[masterEoa.address][AddressZero];

      // refill_requirements_masterSafe
      const safeRequirementAmount = (
        refillRequirements as MasterSafeBalanceRecord
      )['master_safe'][AddressZero];

      // monthly_gas_estimate
      const monthlyGasEstimate =
        SERVICE_TEMPLATES.find(
          (template) => template.home_chain === toMiddlewareChain,
        )?.configurations[toMiddlewareChain]?.monthly_gas_estimate ?? 0;

      // amount = max(refill_requirement_masterSafe, monthly_gas_estimate) + refill_requirements_masterEOA
      const amount =
        bigintMax(BigInt(safeRequirementAmount), BigInt(monthlyGasEstimate)) +
        BigInt(masterEoaRequirementAmount);

      bridgeRequests[nativeTokenIndex].to.amount = amount.toString();

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
    useGetBridgeRequirementsParamsWithMonthlyGasEstimate();

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
