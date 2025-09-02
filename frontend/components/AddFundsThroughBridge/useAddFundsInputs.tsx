import { uniq } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import { AddressBalanceRecord } from '@/client';
import { AddressZero } from '@/constants/address';
import { TokenSymbol } from '@/constants/token';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { BridgeRequest } from '@/types/Bridge';
import { typedKeys } from '@/types/Util';
import { getTokenDetailsFromAddress } from '@/utils/middlewareHelpers';

import { DefaultTokenAmount } from './types';
import { useAddFundsGetBridgeRequirementsParams } from './useAddFundsGetBridgeRequirementsParams';

type GeneratedInput = {
  tokenAddress: Address;
  symbol: TokenSymbol;
  amount: number;
  decimals: number;
};

/**
 * Generate inputs to add funds for bridging.
 *
 * Example: If the chain is Gnosis, user can add OLAS and XDAI.
 * This function will return an array of objects with tokenAddress, symbol, and amount set to 0.
 */
export const useAddFundsInputs = ({
  requirements,
  defaultTokenAmounts,
  destinationAddress,
  onlyNativeToken = false,
}: {
  requirements: AddressBalanceRecord;
  defaultTokenAmounts?: DefaultTokenAmount[];
  destinationAddress?: Address;
  onlyNativeToken?: boolean;
}) => {
  const { selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const getBridgeRequirementsParams =
    useAddFundsGetBridgeRequirementsParams(destinationAddress);

  const allAddresses = typedKeys(requirements);

  // All token addresses that can be used to add funds to the master safe.
  const tokenAddresses = allAddresses.reduce<Address[]>((acc, address) => {
    const tokens = requirements[address];
    if (!tokens) return acc;

    // If onlyNativeToken is true, filter to include only the native token.
    const typedKeysTokens = typedKeys(tokens).filter((token) =>
      onlyNativeToken ? token === AddressZero : true,
    );
    acc.push(...typedKeysTokens);
    return acc;
  }, []);

  const amountsToReceive: GeneratedInput[] = useMemo(
    () =>
      uniq(tokenAddresses).map((tokenAddress: Address) => {
        const details = getTokenDetailsFromAddress(
          toMiddlewareChain,
          tokenAddress,
        );
        const { symbol, decimals } = details;

        // if no default token amounts are provided, set amount to 0.
        // user can update the amount later.
        const defaultAmount =
          defaultTokenAmounts?.find((token) => token.symbol === symbol)
            ?.amount ?? 0;
        return { tokenAddress, symbol, decimals, amount: defaultAmount };
      }),
    [tokenAddresses, toMiddlewareChain, defaultTokenAmounts],
  );

  const [inputs, setInputs] = useState(
    amountsToReceive.reduce(
      (acc, { symbol, amount }) => ({ ...acc, [symbol]: amount }),
      {} as Record<TokenSymbol, number | null>,
    ),
  );

  const handleInputChange = useCallback(
    (symbol: TokenSymbol, value: number | null) => {
      const token = amountsToReceive.find((t) => t.symbol === symbol);
      const decimals = token?.decimals ?? 18;

      if (typeof value === 'number' && !Number.isNaN(value)) {
        // Get number of decimals in the value
        const decimalPlaces = (value.toString().split('.')[1] || '').length;

        // Do not update the input if the value has more
        // decimal places than the token's decimals
        if (decimalPlaces > decimals) return;
      }

      // Safe to update
      setInputs((prev) => ({ ...prev, [symbol]: value }));
    },
    [amountsToReceive],
  );

  // Generate bridge requirements params for the inputs provided by the user.
  const bridgeRequirementsParams = useMemo(() => {
    return amountsToReceive.reduce<BridgeRequest[]>((acc, tokenDetails) => {
      const amount = inputs[tokenDetails.symbol];
      if (!amount) return acc;

      const param = getBridgeRequirementsParams(
        tokenDetails.tokenAddress,
        amount,
      );
      acc.push(param);
      return acc;
    }, []);
  }, [amountsToReceive, inputs, getBridgeRequirementsParams]);

  // If all inputs are empty or zero, disable the button
  const isInputEmpty = useMemo(
    () => Object.values(inputs).every((v) => !v || v <= 0),
    [inputs],
  );

  const inputsToDisplay = useMemo(
    () =>
      Object.entries(inputs).map(([symbol, amount]) => ({
        symbol: symbol as TokenSymbol,
        amount: amount ?? 0,
      })),
    [inputs],
  );

  return {
    inputsToDisplay,
    isInputEmpty,
    onInputChange: handleInputChange,
    bridgeRequirementsParams,
  };
};
