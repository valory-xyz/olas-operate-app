import { useMemo } from 'react';

import { useTokensFundingStatus } from '@/components/SetupPage/FundYourAgent/hooks/useTokensFundingStatus';
import { TokenRequirement } from '@/types';

/**
 * Computes the token amounts from the Pearl wallet that will be used
 * toward the selected agent's funding requirements.
 *
 * For each token: contribution = min(walletBalance, totalTokenRequirement)
 * i.e., totalAmount - pendingAmount from useTokensFundingStatus.
 * Only returns tokens where the wallet contributes > 0.
 */
export const useWalletContribution = () => {
  const { tokensFundingStatus, isLoading } = useTokensFundingStatus();

  const walletContributions = useMemo<TokenRequirement[]>(() => {
    if (!tokensFundingStatus || Object.keys(tokensFundingStatus).length === 0)
      return [];

    return Object.values(tokensFundingStatus)
      .filter(
        (fundingStatus) =>
          fundingStatus.totalAmount - fundingStatus.pendingAmount > 0,
      )
      .map((fundingStatus) => ({
        symbol: fundingStatus.symbol,
        iconSrc: fundingStatus.iconSrc,
        amount: Number(
          (fundingStatus.totalAmount - fundingStatus.pendingAmount).toFixed(4),
        ),
      }));
  }, [tokensFundingStatus]);

  return { walletContributions, isLoading };
};
