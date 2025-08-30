import { useMemo } from 'react';

import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { AgentConfig } from '@/types/Agent';

import { useGetRefillRequimentsWithMonthlyGas } from './useGetRefillRequirementsWithMonthlyGas';

type UseTokensFundingStatusProps = {
  selectedAgentConfig: AgentConfig;
};

export const useTokensFundingStatus = ({
  selectedAgentConfig,
}: UseTokensFundingStatusProps) => {
  const { masterEoa } = useMasterWalletContext();
  const { masterWalletBalances } = useMasterBalances();
  const { tokenRequirements } = useGetRefillRequimentsWithMonthlyGas({
    selectedAgentConfig,
  });
  const currentChain: number = selectedAgentConfig.evmHomeChainId;

  const requiredTokens = tokenRequirements?.map((token) => token.symbol);
  const masterEoaAddress = masterEoa?.address;
  const eoaBalances = useMemo(() => {
    return masterWalletBalances?.filter(
      (balance) =>
        balance.walletAddress === masterEoaAddress &&
        balance.evmChainId === currentChain &&
        requiredTokens?.includes(balance.symbol),
    );
  }, [masterWalletBalances, masterEoaAddress, currentChain, requiredTokens]);

  const fundingStatus = useMemo(() => {
    if (!tokenRequirements || !eoaBalances) {
      return {
        isFullyFunded: false,
        tokenFundingStatus: {},
        missingTokens: [],
      };
    }

    // Create a map of required tokens with their funding status
    const tokenFundingStatus: Record<string, boolean> = {};

    tokenRequirements.forEach((requirement) => {
      const balance = eoaBalances.find(
        (balance) => balance.symbol === requirement.symbol,
      );

      if (balance && balance.balance >= requirement.amount) {
        tokenFundingStatus[requirement.symbol] = true;
      } else {
        tokenFundingStatus[requirement.symbol] = false;
      }
    });

    return {
      isFullyFunded: Object.values(tokenFundingStatus).every(Boolean),
      tokenFundingStatus,
    };
  }, [eoaBalances, tokenRequirements]);

  return fundingStatus;
};
