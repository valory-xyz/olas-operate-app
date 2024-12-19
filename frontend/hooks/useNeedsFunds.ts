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

  const { selectedAgentType, selectedAgentConfig } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  const { selectedStakingProgramId } = useStakingProgram();

  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();

  const isInitialFunded = storeState?.[`isInitialFunded_${selectedAgentType}`];

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

        // Gas requirements
        const gasEstimate = config.monthly_gas_estimate;
        const monthlyGasEstimate = Number(formatUnits(`${gasEstimate}`, 18));
        const nativeTokenSymbol = getNativeTokenSymbol(evmChainId);

        // OLAS staking requirements
        const minimumStakedAmountRequired =
          STAKING_PROGRAMS[evmChainId]?.[resolvedStakingProgramId]
            ?.stakingRequirements?.[TokenSymbol.OLAS] || 0;

        // Additional tokens requirements
        const additionalRequirements =
          selectedAgentConfig.additionalRequirements?.[evmChainId] ?? {};

        results[evmChainId] = {
          [TokenSymbol.OLAS]: minimumStakedAmountRequired,
          [nativeTokenSymbol]: monthlyGasEstimate,
          ...additionalRequirements,
        };
      },
    );

    return results;
  }, [
    selectedAgentConfig.additionalRequirements,
    selectedStakingProgramId,
    serviceTemplate,
    stakingProgramId,
  ]);

  /**
   * Balances by chain
   */
  const balancesByChain = useMemo(() => {
    if (isNil(masterSafeBalances)) return;

    return masterSafeBalances.reduce<{
      [chainId: number]: { [symbol: string]: number };
    }>((acc, { symbol, balance, evmChainId }) => {
      if (!acc[evmChainId]) acc[evmChainId] = { [symbol]: 0 };
      if (!acc[evmChainId][symbol]) acc[evmChainId][symbol] = 0;
      acc[evmChainId][symbol] += balance;

      return acc;
    }, {});
  }, [masterSafeBalances]);

  /**
   * Check if the agent has enough eth for initial funding
   */
  const hasEnoughEthForInitialFunding = useMemo(() => {
    if (isNil(serviceFundRequirements)) return;
    if (isNil(masterSafeBalances)) return;
    if (!balancesByChain) return;

    const chainIds = Object.keys(serviceFundRequirements).map(Number);

    return chainIds.every((chainId) => {
      const nativeTokenSymbol = getNativeTokenSymbol(chainId);
      const nativeTokenBalance =
        balancesByChain[chainId][nativeTokenSymbol] || 0;
      const nativeTokenRequired =
        serviceFundRequirements[chainId]?.[nativeTokenSymbol] || 0;

      return nativeTokenBalance >= nativeTokenRequired;
    });
  }, [serviceFundRequirements, balancesByChain, masterSafeBalances]);

  /**
   * Check if the agent has enough OLAS for initial funding
   */
  const hasEnoughOlasForInitialFunding = useMemo(() => {
    if (!serviceFundRequirements) return;
    if (!masterSafeBalances) return;
    if (!balancesByChain) return;

    const chainIds = Object.keys(serviceFundRequirements).map(Number);

    return chainIds.every((chainId) => {
      const olasBalance = balancesByChain[chainId][TokenSymbol.OLAS] || 0;
      const olasRequired =
        serviceFundRequirements[chainId]?.[TokenSymbol.OLAS] || 0;

      return olasBalance >= olasRequired;
    });
  }, [masterSafeBalances, balancesByChain, serviceFundRequirements]);

  /**
   * Check if the agent requires additional tokens and has enough for initial funding
   */
  const hasEnoughAdditionalTokensForInitialFunding = useMemo(() => {
    if (isNil(serviceFundRequirements)) return;
    if (isNil(masterSafeBalances)) return;
    if (!balancesByChain) return;

    const chainIds = Object.keys(serviceFundRequirements).map(Number);

    return chainIds.every((chainId) => {
      const nativeTokenSymbol = getNativeTokenSymbol(chainId);
      const additionalTokens = Object.keys(
        serviceFundRequirements[chainId],
      ).filter(
        (token) => token !== TokenSymbol.OLAS && token !== nativeTokenSymbol,
      );

      if (additionalTokens.length === 0) return true;

      return additionalTokens.every((tokenSymbol) => {
        const tokenBalance = balancesByChain[chainId][tokenSymbol] || 0;
        const tokenRequired =
          serviceFundRequirements[chainId]?.[tokenSymbol] || 0;

        return tokenBalance >= tokenRequired;
      });
    });
  }, [serviceFundRequirements, masterSafeBalances, balancesByChain]);

  /**
   * Check if the agent needs initial funding (both eth and olas)
   */
  const needsInitialFunding: boolean = useMemo(() => {
    if (isInitialFunded) return false;
    if (!isBalanceLoaded) return false;
    if (
      hasEnoughEthForInitialFunding &&
      hasEnoughOlasForInitialFunding &&
      hasEnoughAdditionalTokensForInitialFunding
    )
      return false;
    return true;
  }, [
    hasEnoughAdditionalTokensForInitialFunding,
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    isBalanceLoaded,
    isInitialFunded,
  ]);

  return {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    hasEnoughAdditionalTokensForInitialFunding,
    balancesByChain,
    serviceFundRequirements,
    isInitialFunded,
    needsInitialFunding,
  };
};
