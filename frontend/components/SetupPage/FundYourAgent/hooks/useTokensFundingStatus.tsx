import { useEffect, useMemo, useState } from 'react';

import { EvmChainId } from '@/constants/chains';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { AgentConfig } from '@/types/Agent';

import { useGetRefillRequirementsWithMonthlyGas } from './useGetRefillRequirementsWithMonthlyGas';

type UseTokensFundingStatusProps = {
  selectedAgentConfig: AgentConfig;
};

/**
 * Hook to get the funding status of the tokens required for the agent onboarding.
 * It compares the required token amount with the token's balance
 * in masterEoa to determine whether the requirement is met or not.
 * @example
 * {
 *  isFullyFunded: false,
 *  tokenFundingStatus: {
 *    OLAS: true,
 *    XDAI: false,
 *  }
 * }
 */
export const useTokensFundingStatus = ({
  selectedAgentConfig,
}: UseTokensFundingStatusProps) => {
  const { masterEoaBalancesByChain } = useMasterBalances();
  const { initialTokenRequirements: tokenRequirements } =
    useGetRefillRequirementsWithMonthlyGas({
      selectedAgentConfig,
    });
  const [hasBeenFullyFunded, setHasBeenFullyFunded] = useState(false);
  const currentChain: number = selectedAgentConfig.evmHomeChainId;

  const requiredTokens = tokenRequirements?.map((token) => token.symbol);
  const eoaBalances = useMemo(
    () =>
      masterEoaBalancesByChain(currentChain as EvmChainId).filter((balance) =>
        requiredTokens?.includes(balance.symbol),
      ),
    [masterEoaBalancesByChain, currentChain, requiredTokens],
  );

  const fundingStatus = useMemo(() => {
    if (!tokenRequirements || !eoaBalances) {
      return {
        isFullyFunded: false,
        tokensFundingStatus: {},
      };
    }

    // Create a map of required tokens with their funding status
    const tokensFundingStatus: Record<string, boolean> = {};

    tokenRequirements.forEach((requirement) => {
      const eoa = eoaBalances.find(
        (balance) => balance.symbol === requirement.symbol,
      );

      if (eoa && eoa.balance >= requirement.amount) {
        tokensFundingStatus[requirement.symbol] = true;
      } else {
        tokensFundingStatus[requirement.symbol] = false;
      }
    });

    const isFullyFunded = Object.values(tokensFundingStatus).every(Boolean);
    return {
      isFullyFunded,
      tokensFundingStatus,
    };
  }, [eoaBalances, tokenRequirements]);

  /**
   * Once the funds have been recieved completely, don't recalculate the statuses,
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
      tokensFundingStatus: Object.fromEntries(
        requiredTokens?.map((token) => [token, true]) || [],
      ),
    };

  return fundingStatus;
};
