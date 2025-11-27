import { useEffect, useMemo, useState } from 'react';

import {
  useGetRefillRequirements,
  useMasterBalances,
  useServices,
} from '@/hooks';

/**
 * Hook to get the funding status of the tokens required for the agent onboarding.
 * It compares the required token amount with the token's balance
 * in masterEoa to determine whether the requirement is met or not.
 * @example
 * {
 *  isFullyFunded: false,
 *  tokensFundingStatus: {
 *    OLAS: {
 *      funded: false,
 *      pendingAmount: 100,
 *    },
 *    XDAI: {
 *      funded: true,
 *      pendingAmount: 0,
 *    },
 *  }
 * }
 */
export const useTokensFundingStatus = () => {
  const { getMasterEoaBalancesOf, getMasterSafeBalancesOf, isLoaded } =
    useMasterBalances();
  const { selectedAgentConfig } = useServices();
  const { totalTokenRequirements: tokenRequirements } =
    useGetRefillRequirements();
  const [hasBeenFullyFunded, setHasBeenFullyFunded] = useState(false);
  const currentChain = selectedAgentConfig.evmHomeChainId;

  const requiredTokens = tokenRequirements?.map((token) => token.symbol);
  const walletBalances = useMemo(() => {
    if (!isLoaded) return [];

    // Try to get balances from master safe if it exists
    // otherwise use master eoa
    let existingWalletBalances = getMasterSafeBalancesOf(currentChain);
    if (existingWalletBalances.length === 0) {
      existingWalletBalances = getMasterEoaBalancesOf(currentChain);
    }

    return existingWalletBalances.filter((balance) =>
      requiredTokens?.includes(balance.symbol),
    );
  }, [
    isLoaded,
    getMasterSafeBalancesOf,
    currentChain,
    getMasterEoaBalancesOf,
    requiredTokens,
  ]);

  const fundingStatus = useMemo(() => {
    if (
      !tokenRequirements ||
      tokenRequirements.length === 0 ||
      !walletBalances
    ) {
      return {
        isFullyFunded: false,
        tokensFundingStatus: {},
      };
    }

    // Create a map of required tokens with their funding status
    const tokensFundingStatus: Record<
      string,
      { funded: boolean; pendingAmount: number }
    > = {};

    tokenRequirements.forEach((requirement) => {
      const walletBalance = walletBalances.find(
        (balance) => balance.symbol === requirement.symbol,
      );

      if (walletBalance && walletBalance.balance >= requirement.amount) {
        tokensFundingStatus[requirement.symbol] = {
          funded: true,
          pendingAmount: 0,
        };
      } else {
        tokensFundingStatus[requirement.symbol] = {
          funded: false,
          pendingAmount: requirement.amount - (walletBalance?.balance ?? 0),
        };
      }
    });

    const isFullyFunded = Object.values(tokensFundingStatus).every(
      (status) => status.funded,
    );
    return {
      isFullyFunded,
      tokensFundingStatus,
    };
  }, [tokenRequirements, walletBalances]);

  /**
   * Once the funds have been received completely, don't recalculate the statuses,
   * as the EOA balance might change if the funds are transferred to the newly created master_safe
   */
  useEffect(() => {
    if (fundingStatus.isFullyFunded && !hasBeenFullyFunded) {
      setHasBeenFullyFunded(true);
    }
  }, [fundingStatus.isFullyFunded, hasBeenFullyFunded]);

  if (hasBeenFullyFunded)
    return {
      isFullyFunded: true,
      tokensFundingStatus: requiredTokens
        ? Object.fromEntries(
            requiredTokens.map((token) => [
              token,
              { funded: true, pendingAmount: 0 },
            ]),
          )
        : {},
    };

  return fundingStatus;
};
