import { uniq } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import { AddressBalanceRecord } from '@/client';
import { TokenSymbol } from '@/enums/Token';
import { useServices } from '@/hooks/useServices';
import { Address } from '@/types/Address';
import { BridgeRequest } from '@/types/Bridge';
import { typedKeys } from '@/types/Util';
import { getTokenDetailsFromAddress } from '@/utils/middlewareHelpers';

import { DefaultTokenAmount } from './types';
import { useGetBridgeRequirementsParams } from './useGetBridgeRequirementsParams';

export type GeneratedInput = {
  tokenAddress: Address;
  symbol: TokenSymbol;
  amount: number;
};

/**
 * Generate inputs to add funds for bridging.
 *
 * Example: If the chain is Gnosis, user can add OLAS and XDAI.
 * This function will return an array of objects with tokenAddress, symbol, and amount set to 0.
 */
export const useGenerateAddFunds = (
  requirements: AddressBalanceRecord,
  defaultTokenAmounts?: DefaultTokenAmount[],
) => {
  const { selectedAgentConfig } = useServices();
  const toMiddlewareChain = selectedAgentConfig.middlewareHomeChainId;
  const getBridgeRequirementsParams = useGetBridgeRequirementsParams();

  // master_safe and master_eoa addresses in general.
  const allAddresses = typedKeys(requirements);

  // all token addresses that can be used to add funds to the master safe.
  const tokenAddresses = allAddresses.reduce<Address[]>((acc, address) => {
    const tokens = requirements[address];
    if (tokens) {
      acc.push(...typedKeys(tokens));
    }
    return acc;
  }, []);

  const amountsToReceive: GeneratedInput[] = uniq(tokenAddresses).map(
    (tokenAddress: Address) => {
      const symbol = getTokenDetailsFromAddress(
        toMiddlewareChain,
        tokenAddress,
      ).symbol;

      // if no default token amounts are provided, set amount to 0.
      // user can update the amount later.
      const defaultAmount =
        defaultTokenAmounts?.find((token) => token.symbol === symbol)?.amount ??
        0;
      return { tokenAddress, symbol, amount: defaultAmount };
    },
  );

  const [inputs, setInputs] = useState(
    amountsToReceive.reduce(
      (acc, { symbol, amount }) => ({ ...acc, [symbol]: amount }),
      {} as Record<TokenSymbol, number | null>,
    ),
  );

  const handleInputChange = useCallback(
    (symbol: TokenSymbol, value: number | null) => {
      setInputs((prev) => ({ ...prev, [symbol]: value }));
    },
    [],
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
