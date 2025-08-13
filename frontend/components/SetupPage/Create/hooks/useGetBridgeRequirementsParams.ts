import { isAddress } from 'ethers/lib/utils';
import { useCallback } from 'react';

import { AddressBalanceRecord, MasterSafeBalanceRecord } from '@/client';
import { getFromToken } from '@/components/Bridge/utils';
import { ETHEREUM_TOKEN_CONFIG, TOKEN_CONFIG } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import {
  AllEvmChainId,
  AllEvmChainIdMap,
  EvmChainId,
} from '@/constants/chains';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { BridgeRefillRequirementsRequest } from '@/types/Bridge';
import { areAddressesEqual } from '@/utils/address';
import { bigintMax } from '@/utils/calculations';
import { asAllMiddlewareChain, asEvmChainId } from '@/utils/middlewareHelpers';

type TransferDirection = 'to' | 'from';

/**
 *
 * @warning A HOOK THAT SHOULD NEVER EXIST.
 * @deprecated TODO: This hook is used because BE doesn't support monthly_gas_estimate in the refill requirements yet.
 * Remove the hook once it's supported.
 *
 * Hook to return the updated bridge requirements params to improve the
 * initial funding requirements.
 *
 * Request quote with formula (will be moved to backend):
 *   max(refill_requirement_masterSafe, monthly_gas_estimate) + refill_requirements_masterEOA
 *
 */
const useGetBridgeRequirementsParamsWithMonthlyGasEstimate = (
  transferDirection: TransferDirection,
) => {
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
        areAddressesEqual(req[transferDirection].token, AddressZero),
      );
      if (nativeTokenIndex === -1) return;

      // refill_requirements_masterEOA
      const masterEoaRequirementAmount = (
        refillRequirements as AddressBalanceRecord
      )[masterEoa.address]?.[AddressZero];

      // refill_requirements_masterSafe
      const safeRequirementAmount = (
        refillRequirements as MasterSafeBalanceRecord
      )['master_safe']?.[AddressZero];

      if (!masterEoaRequirementAmount) return;
      if (!safeRequirementAmount) return;

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
      transferDirection,
    ],
  );
};

/**
 * @returns A function that returns the bridge refill requirements parameters
 * based on the current refill requirements OR null if requirements are not available/loading.
 */
export const useGetBridgeRequirementsParams = (
  fromChainId: AllEvmChainId,
  defaultFromToken?: Address,
  transferDirection: TransferDirection = 'from',
) => {
  const { selectedAgentConfig } = useServices();
  const { masterEoa } = useMasterWalletContext();
  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const getUpdatedBridgeRequirementsParams =
    useGetBridgeRequirementsParamsWithMonthlyGasEstimate(transferDirection);

  const fromChainConfig =
    fromChainId === AllEvmChainIdMap.Ethereum
      ? ETHEREUM_TOKEN_CONFIG
      : TOKEN_CONFIG[fromChainId as EvmChainId];
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const fromAddress = masterEoa?.address;
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
        bridge_requests:
          getUpdatedBridgeRequirementsParams(bridgeRequests) || bridgeRequests,
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
      getUpdatedBridgeRequirementsParams,
    ],
  );
};
