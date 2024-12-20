import { formatUnits } from 'ethers/lib/utils';
import { isNil } from 'lodash';
import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { getNativeTokenSymbol } from '@/config/tokens';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Maybe } from '@/types/Util';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { useBalanceContext, useMasterBalances } from './useBalanceContext';
import { useServices } from './useServices';
import { useStakingProgram } from './useStakingProgram';
import { useStore } from './useStore';

export const useNeedsFunds = (stakingProgramId: Maybe<StakingProgramId>) => {
  const { storeState } = useStore();

  const { selectedAgentType } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );
  const { selectedStakingProgramId } = useStakingProgram();

  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();

  const isInitialFunded = storeState?.[selectedAgentType]?.isInitialFunded;
  const serviceFundRequirements = useMemo<{
    [chainId: number]: {
      [tokenSymbol: string]: number;
    };
  }>(() => {
    if (isNil(serviceTemplate)) return {};

    const results: {
      [chainId: number]: {
        [tokenSymbol: string]: number;
      };
    } = {};

    Object.entries(serviceTemplate.configurations).forEach(
      ([middlewareChain, config]) => {
        const evmChainId = asEvmChainId(middlewareChain);

        // if stakingProgramId not provided, use the selected one
        const resolvedStakingProgramId =
          stakingProgramId ?? selectedStakingProgramId;

        if (!resolvedStakingProgramId) return;

        const gasEstimate = config.monthly_gas_estimate;
        const monthlyGasEstimate = Number(formatUnits(`${gasEstimate}`, 18));
        const minimumStakedAmountRequired =
          STAKING_PROGRAMS[evmChainId]?.[resolvedStakingProgramId]
            ?.stakingRequirements?.[TokenSymbol.OLAS] || 0;

        const nativeTokenSymbol = getNativeTokenSymbol(evmChainId);

        results[evmChainId] = {
          [TokenSymbol.OLAS]: minimumStakedAmountRequired,
          [nativeTokenSymbol]: monthlyGasEstimate,
          // TODO: extend with any further erc20s..
        };
      },
    );

    return results;
  }, [selectedStakingProgramId, serviceTemplate, stakingProgramId]);

  /**
   * Native balances by chain
   */
  const nativeBalancesByChain = useMemo(() => {
    if (isNil(masterSafeBalances)) return;

    return masterSafeBalances.reduce<{
      [chainId: number]: number;
    }>((acc, { symbol, balance, evmChainId }) => {
      if (getNativeTokenSymbol(evmChainId) !== symbol) return acc;

      if (!acc[evmChainId]) acc[evmChainId] = 0;
      acc[evmChainId] += balance;

      return acc;
    }, {});
  }, [masterSafeBalances]);

  /**
   * Check if the agent has enough eth for initial funding
   */
  const hasEnoughEthForInitialFunding = useMemo(() => {
    if (isNil(serviceFundRequirements)) return;
    if (isNil(masterSafeBalances)) return;
    if (!nativeBalancesByChain) return;

    const chainIds = Object.keys(serviceFundRequirements).map(Number);

    return chainIds.every((chainId) => {
      const nativeTokenSymbol = getNativeTokenSymbol(chainId);
      const nativeTokenBalance = nativeBalancesByChain[chainId] || 0;
      const nativeTokenRequired =
        serviceFundRequirements[chainId]?.[nativeTokenSymbol] || 0;

      return nativeTokenBalance >= nativeTokenRequired;
    });
  }, [serviceFundRequirements, nativeBalancesByChain, masterSafeBalances]);

  /**
   * OLAS balances by chain
   */
  const olasBalancesByChain = useMemo(() => {
    if (!masterSafeBalances) return;

    return masterSafeBalances.reduce<{
      [chainId: number]: number;
    }>((acc, { symbol, balance, evmChainId }) => {
      if (TokenSymbol.OLAS !== symbol) return acc;

      if (!acc[evmChainId]) acc[evmChainId] = 0;
      acc[evmChainId] += balance;

      return acc;
    }, {});
  }, [masterSafeBalances]);

  const hasEnoughOlasForInitialFunding = useMemo(() => {
    if (!serviceFundRequirements) return;
    if (!masterSafeBalances) return;
    if (!olasBalancesByChain) return;

    const chainIds = Object.keys(serviceFundRequirements).map(Number);

    return chainIds.every((chainId) => {
      const olasBalance = olasBalancesByChain[chainId] || 0;
      const olasRequired =
        serviceFundRequirements[chainId]?.[TokenSymbol.OLAS] || 0;

      return olasBalance >= olasRequired;
    });
  }, [masterSafeBalances, olasBalancesByChain, serviceFundRequirements]);

  /**
   * Check if the agent needs initial funding (both eth and olas)
   */
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
    nativeBalancesByChain,
    olasBalancesByChain,
    serviceFundRequirements,
    isInitialFunded,
    needsInitialFunding,
  };
};
