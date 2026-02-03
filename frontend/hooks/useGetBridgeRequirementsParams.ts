import { isAddress } from 'ethers/lib/utils';
import { useCallback, useMemo } from 'react';

import { ETHEREUM_TOKEN_CONFIG, TOKEN_CONFIG } from '@/config/tokens';
import {
  AddressZero,
  AllEvmChainId,
  AllEvmChainIdMap,
  EvmChainId,
} from '@/constants';
import { MASTER_SAFE_REFILL_PLACEHOLDER } from '@/constants/defaults';
import {
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
  useServices,
} from '@/hooks';
import {
  Address,
  AddressBalanceRecord,
  BridgeRefillRequirementsRequest,
  MasterSafeBalanceRecord,
} from '@/types';
import {
  areAddressesEqual,
  asAllMiddlewareChain,
  asEvmChainId,
  getFromToken,
} from '@/utils';

type TransferDirection = 'to' | 'from';

/**
 * Hook to combine native token requirements from master safe and master EOA.
 * Updates bridge requests with the combined native token amount.
 *
 * Formula: refill_requirement_masterSafe + refill_requirements_masterEOA
 */
const useCombineNativeTokenRequirements = (
  transferDirection: TransferDirection,
) => {
  const { selectedAgentConfig } = useServices();
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletsFetched,
  } = useMasterWalletContext();
  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();

  const masterSafe = useMemo(
    () => getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId),
    [getMasterSafeOf, selectedAgentConfig.evmHomeChainId],
  );

  return useCallback(
    (bridgeRequests: BridgeRefillRequirementsRequest['bridge_requests']) => {
      if (
        isBalancesAndFundingRequirementsLoading ||
        !refillRequirements ||
        !masterEoa?.address ||
        !isMasterWalletsFetched
      )
        return;

      const nativeTokenIndex = bridgeRequests.findIndex((req) =>
        areAddressesEqual(req[transferDirection].token, AddressZero),
      );
      if (nativeTokenIndex === -1) return;

      // Refill requirements for masterEOA
      const masterEoaRequirementAmount = (
        refillRequirements as AddressBalanceRecord
      )[masterEoa.address]?.[AddressZero];

      // Refill requirements for masterSafe (placeholder)
      const masterSafePlaceholder = (
        refillRequirements as MasterSafeBalanceRecord
      )?.[MASTER_SAFE_REFILL_PLACEHOLDER];

      // Refill requirements for masterSafe
      // uses actual safe address if available, otherwise fallback to placeholder
      const safeRequirementAmount = (
        masterSafe
          ? (refillRequirements as AddressBalanceRecord)?.[masterSafe.address]
          : masterSafePlaceholder
      )?.[AddressZero];

      if (!masterEoaRequirementAmount) return;
      if (!safeRequirementAmount) return;

      // amount = refill_requirement_masterSafe + refill_requirements_masterEOA
      const amount =
        BigInt(safeRequirementAmount) + BigInt(masterEoaRequirementAmount);

      bridgeRequests[nativeTokenIndex].to.amount = amount.toString();

      return bridgeRequests;
    },
    [
      isBalancesAndFundingRequirementsLoading,
      refillRequirements,
      masterEoa,
      isMasterWalletsFetched,
      masterSafe,
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
  const { masterEoa, getMasterSafeOf } = useMasterWalletContext();
  const { refillRequirements, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const getUpdatedBridgeRequirementsParams =
    useCombineNativeTokenRequirements(transferDirection);

  const masterSafe = useMemo(
    () => getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId),
    [getMasterSafeOf, selectedAgentConfig.evmHomeChainId],
  );

  const fromChainConfig =
    fromChainId === AllEvmChainIdMap.Ethereum
      ? ETHEREUM_TOKEN_CONFIG
      : TOKEN_CONFIG[fromChainId as EvmChainId];
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const fromAddress =
    getMasterSafeOf?.(fromChainId as EvmChainId)?.address ?? masterEoa?.address;
  const toAddress = masterSafe?.address ?? masterEoa?.address;

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
        // Only calculate the refill requirements from master EOA or master safe (address or placeholder)
        const isRecipientAddress = areAddressesEqual(walletAddress, toAddress);
        const isMasterSafeAddress = masterSafe
          ? areAddressesEqual(walletAddress, masterSafe.address)
          : walletAddress === MASTER_SAFE_REFILL_PLACEHOLDER;
        if (!(isRecipientAddress || isMasterSafeAddress)) {
          continue;
        }

        for (const [untypedTokenAddress, amount] of Object.entries(
          tokensWithRequirements,
        )) {
          if (!isAddress(untypedTokenAddress)) continue;
          if (BigInt(amount) === 0n) continue;

          const tokenAddress = untypedTokenAddress as Address;
          const fromToken =
            defaultFromToken ||
            getFromToken(tokenAddress, fromChainConfig, toChainConfig);

          const fromChain = asAllMiddlewareChain(fromChainId);
          const toChain = toMiddlewareChain;

          const existingRequest = bridgeRequests.find(
            (req) =>
              req.from.chain === fromChain &&
              req.to.chain === toChain &&
              areAddressesEqual(req.from.address, fromAddress) &&
              areAddressesEqual(req.to.address, toAddress) &&
              areAddressesEqual(req.from.token, fromToken) &&
              areAddressesEqual(req.to.token, tokenAddress),
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
                token: tokenAddress,
                amount,
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
      masterSafe,
      getUpdatedBridgeRequirementsParams,
    ],
  );
};
