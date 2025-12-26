import { isEmpty } from 'lodash';
import { useEffect, useMemo, useState } from 'react';

import {
  useGetRefillRequirements,
  useMasterBalances,
  useServices,
} from '@/hooks';
import { TokenRequirement } from '@/types';

type TokenFundingStatus = {
  symbol: string;
  iconSrc: string;
  totalAmount: number;
  pendingAmount: number;
  areFundsReceived: boolean;
};

/**
 * Hook to get the funding status of the tokens required for the agent onboarding.
 * It compares the required token amount with the token's balance
 * in masterEoa to determine whether the requirement is met or not.
 * @example
 * {
 *  isFullyFunded: false,
 *  isLoading: false,
 *  tokensFundingStatus: {
 *    OLAS: {
 *      symbol: 'OLAS',
 *      iconSrc: '...',
 *      totalAmount: 100,
 *      pendingAmount: 100,
 *      areFundsReceived: false,
 *    },
 *    XDAI: {
 *      symbol: 'XDAI',
 *      iconSrc: '...',
 *      totalAmount: 11.5,
 *      pendingAmount: 0,
 *      areFundsReceived: true,
 *    },
 *  }
 * }
 */
export const useTokensFundingStatus = () => {
  const { getMasterEoaBalancesOf, getMasterSafeBalancesOf, isLoaded } =
    useMasterBalances();
  const { selectedAgentConfig } = useServices();
  const {
    totalTokenRequirements: tokenRequirements,
    isLoading: isLoadingTotalTokenRequirements,
  } = useGetRefillRequirements();
  const [hasBeenFullyFunded, setHasBeenFullyFunded] = useState(false);
  const currentChain = selectedAgentConfig.evmHomeChainId;

  const [requiredTokens, setRequiredTokens] = useState<TokenRequirement[]>([]);
  useEffect(() => {
    if (tokenRequirements?.length > 0 && requiredTokens.length === 0) {
      setRequiredTokens(tokenRequirements);
    }
  }, [requiredTokens.length, tokenRequirements]);

  const walletBalances = useMemo(() => {
    if (!isLoaded) return [];

    // Try to get balances from master safe if it exists
    // otherwise use master eoa
    let existingWalletBalances = getMasterSafeBalancesOf(currentChain);
    if (existingWalletBalances.length === 0) {
      existingWalletBalances = getMasterEoaBalancesOf(currentChain);
    }

    return existingWalletBalances.filter((balance) =>
      requiredTokens.some((token) => token.symbol === balance.symbol),
    );
  }, [
    isLoaded,
    getMasterSafeBalancesOf,
    currentChain,
    getMasterEoaBalancesOf,
    requiredTokens,
  ]);

  const fundingStatus = useMemo(() => {
    if (hasBeenFullyFunded) {
      return {
        isFullyFunded: true,
        tokensFundingStatus: requiredTokens
          ? Object.fromEntries(
              requiredTokens.map((token) => [
                token.symbol,
                {
                  symbol: token.symbol,
                  iconSrc: token.iconSrc,
                  totalAmount: token.amount,
                  pendingAmount: 0,
                  areFundsReceived: true,
                },
              ]),
            )
          : {},
      };
    }

    if (isEmpty(tokenRequirements) || isEmpty(walletBalances)) {
      return {
        isFullyFunded: false,
        tokensFundingStatus: {},
      };
    }

    // Create a map of required tokens with their funding status
    const tokensFundingStatus: Record<string, TokenFundingStatus> = {};

    requiredTokens.forEach((requirement) => {
      const wallet = walletBalances.find(
        (balance) => balance.symbol === requirement.symbol,
      );
      const { symbol, iconSrc, amount } = requirement;

      if (wallet && wallet.balance >= amount) {
        tokensFundingStatus[symbol] = {
          symbol,
          iconSrc,
          totalAmount: amount,
          areFundsReceived: true,
          pendingAmount: 0,
        };
      } else {
        tokensFundingStatus[symbol] = {
          symbol,
          iconSrc,
          totalAmount: amount,
          areFundsReceived: false,
          pendingAmount: amount - (wallet?.balance ?? 0),
        };
      }
    });

    const isFullyFunded = Object.values(tokensFundingStatus).every(
      (status) => status.areFundsReceived,
    );
    return {
      isFullyFunded,
      tokensFundingStatus,
    };
  }, [hasBeenFullyFunded, requiredTokens, tokenRequirements, walletBalances]);

  /**
   * Once the funds have been received completely, don't recalculate the statuses,
   * as the EOA balance might change if the funds are transferred to the newly created master_safe
   */
  useEffect(() => {
    if (fundingStatus.isFullyFunded && !hasBeenFullyFunded) {
      setHasBeenFullyFunded(true);
    }
  }, [fundingStatus.isFullyFunded, hasBeenFullyFunded]);

  return {
    ...fundingStatus,
    isLoading: isLoadingTotalTokenRequirements,
  };
};
