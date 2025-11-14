import { useEffect, useMemo, useState } from 'react';

import { useMasterBalances, useServices } from '@/hooks';

import { useGetRefillRequirementsWithMonthlyGas } from './useGetRefillRequirementsWithMonthlyGas';

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
  const { getMasterEoaBalancesOf } = useMasterBalances();
  const { selectedAgentConfig } = useServices();
  const { totalTokenRequirements: tokenRequirements } =
    useGetRefillRequirementsWithMonthlyGas();
  const [hasBeenFullyFunded, setHasBeenFullyFunded] = useState(false);
  const currentChain = selectedAgentConfig.evmHomeChainId;

  const requiredTokens = tokenRequirements?.map((token) => token.symbol);
  const eoaBalances = useMemo(
    () =>
      getMasterEoaBalancesOf(currentChain).filter((balance) =>
        requiredTokens?.includes(balance.symbol),
      ),
    [getMasterEoaBalancesOf, currentChain, requiredTokens],
  );

  const fundingStatus = useMemo(() => {
    if (!tokenRequirements || tokenRequirements.length === 0 || !eoaBalances) {
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
      const eoa = eoaBalances.find(
        (balance) => balance.symbol === requirement.symbol,
      );

      if (eoa && eoa.balance >= requirement.amount) {
        tokensFundingStatus[requirement.symbol] = {
          funded: true,
          pendingAmount: 0,
        };
      } else {
        tokensFundingStatus[requirement.symbol] = {
          funded: false,
          pendingAmount: requirement.amount - (eoa?.balance ?? 0),
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
  }, [eoaBalances, tokenRequirements]);

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
