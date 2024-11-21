import { formatEther, formatUnits } from 'ethers/lib/utils';
import { useMemo } from 'react';

import { ServiceTemplate } from '@/client';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { getNativeTokenSymbol } from '@/config/tokens';
import { getServiceTemplate } from '@/constants/serviceTemplates';
import { TokenSymbol } from '@/enums/Token';

import { useBalanceContext, useMasterBalances } from './useBalanceContext';
import { useService } from './useService';
import { useStore } from './useStore';

export const useNeedsFunds = (serviceConfigId?: string) => {
  const { storeState } = useStore();
  const { service } = useService({ serviceConfigId });
  const { isLoaded: isBalanceLoaded, walletBalances } = useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();

  const isInitialFunded = storeState?.isInitialFunded;

  const serviceTemplate = useMemo<ServiceTemplate | undefined>(
    () => (service ? getServiceTemplate(service.hash) : undefined),
    [service],
  );

  const serviceFundRequirements = useMemo<{
    [chainId: number]: {
      [tokenSymbol: string]: number;
    };
  }>(() => {
    if (!serviceTemplate) return {};

    const results: {
      [chainId: number]: {
        [tokenSymbol: string]: number;
      };
    } = {};

    Object.entries(serviceTemplate.configurations).forEach(
      ([chainId, config]) => {
        const templateStakingProgramId =
          serviceTemplate.configurations[+chainId].staking_program_id;
        const serviceStakingProgramId =
          service?.chain_configs[+chainId]?.chain_data?.user_params
            ?.staking_program_id;
        const stakingProgramId =
          serviceStakingProgramId ?? templateStakingProgramId;

        if (!stakingProgramId) return;
        if (!service?.chain_configs[+chainId]) return;

        const gasEstimate = config.monthly_gas_estimate;
        const monthlyGasEstimate = Number(formatUnits(`${gasEstimate}`, 18));
        const minimumStakedAmountRequired =
          STAKING_PROGRAMS[+chainId]?.[stakingProgramId]?.stakingRequirements?.[
            TokenSymbol.OLAS
          ] || 0;

        const nativeTokenSymbol = getNativeTokenSymbol(+chainId);

        results[+chainId] = {
          [TokenSymbol.OLAS]: +formatEther(minimumStakedAmountRequired),
          [nativeTokenSymbol]: +formatEther(monthlyGasEstimate),
          // TODO: extend with any further erc20s..
        };
      },
    );

    return results;
  }, [service?.chain_configs, serviceTemplate]);

  const hasEnoughEthForInitialFunding = useMemo(() => {
    if (!serviceFundRequirements) return;
    if (!walletBalances) return;

    const nativeBalancesByChain = walletBalances.reduce<{
      [chainId: number]: number;
    }>((acc, { symbol, balance, chainId }) => {
      if (getNativeTokenSymbol(chainId) !== symbol) return acc;

      if (!acc[chainId]) acc[chainId] = 0;
      acc[chainId] += balance;

      return acc;
    }, {});

    const chainIds = Object.keys(serviceFundRequirements).map(Number);

    return chainIds.every((chainId) => {
      const nativeTokenSymbol = getNativeTokenSymbol(chainId);
      const nativeTokenBalance = nativeBalancesByChain[chainId] || 0;
      const nativeTokenRequired =
        serviceFundRequirements[chainId]?.[nativeTokenSymbol] || 0;

      return nativeTokenBalance >= nativeTokenRequired;
    });
  }, [serviceFundRequirements, walletBalances]);

  const hasEnoughOlasForInitialFunding = useMemo(() => {
    if (!serviceFundRequirements) return;
    if (!masterSafeBalances) return;

    const olasBalancesByChain = masterSafeBalances.reduce<{
      [chainId: number]: number;
    }>((acc, { symbol, balance, chainId }) => {
      if (TokenSymbol.OLAS !== symbol) return acc;

      if (!acc[chainId]) acc[chainId] = 0;
      acc[chainId] += balance;

      return acc;
    }, {});

    const chainIds = Object.keys(serviceFundRequirements).map(Number);

    return chainIds.every((chainId) => {
      const olasBalance = olasBalancesByChain[chainId] || 0;
      const olasRequired =
        serviceFundRequirements[chainId]?.[TokenSymbol.OLAS] || 0;

      return olasBalance >= olasRequired;
    });
  }, [masterSafeBalances, serviceFundRequirements]);

  const needsInitialFunding: boolean = useMemo(() => {
    if (isInitialFunded) return false;
    if (!isBalanceLoaded) return false;
    if (hasEnoughEthForInitialFunding && hasEnoughOlasForInitialFunding)
      return false;
    return true;
  }, [
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    isBalanceLoaded,
    isInitialFunded,
  ]);

  return {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    serviceFundRequirements,
    isInitialFunded,
    needsInitialFunding,
  };
};
