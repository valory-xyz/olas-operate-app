import { formatUnits } from 'ethers/lib/utils';
import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { getNativeTokenSymbol } from '@/config/tokens';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { EvmChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import { Maybe } from '@/types/Util';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { useBalanceContext, useMasterBalances } from './useBalanceContext';
import { useServices } from './useServices';
import { useStakingProgram } from './useStakingProgram';
import { useStore } from './useStore';

type ChainTokenSymbol = {
  [chainId in EvmChainId]: {
    [tokenSymbol: string]: number;
  };
};

export const useNeedsFunds = (stakingProgramId: Maybe<StakingProgramId>) => {
  const { storeState } = useStore();

  const { selectedAgentType, selectedAgentConfig } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  const { selectedStakingProgramId } = useStakingProgram();

  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();

  const isInitialFunded = storeState?.[selectedAgentType]?.isInitialFunded;

  /**
   * Service fund requirements by chain
   * @example gnosis requires 20 OLAS and 10 XDAI
   * { 100: { OLAS: 40, XDAI: 10 } }
   */
  const serviceFundRequirements = useMemo<ChainTokenSymbol>(() => {
    if (isNil(serviceTemplate)) return {} as ChainTokenSymbol;

    const results = {} as ChainTokenSymbol;

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
   * Actual balances by chain
   * @example gnosis has 20 OLAS and 0.1 ETH
   * { 100: { OLAS: 20, ETH: 0.1 } }
   */
  const balancesByChain = useMemo(() => {
    if (isNil(masterSafeBalances) || isEmpty(masterSafeBalances)) return;

    return masterSafeBalances.reduce<{
      [chainId in EvmChainId]: { [symbol: string]: number };
    }>((acc, { symbol, balance, evmChainId }) => {
      if (!acc[evmChainId]) acc[evmChainId] = { [symbol]: 0 };
      if (!acc[evmChainId][symbol]) acc[evmChainId][symbol] = 0;
      acc[evmChainId][symbol] += balance;

      return acc;
    }, {} as ChainTokenSymbol);
  }, [masterSafeBalances]);

  const serviceChainIds = useMemo(() => {
    if (isNil(serviceFundRequirements)) return;

    return Object.keys(serviceFundRequirements).map(
      (key) => key as unknown as EvmChainId,
    );
  }, [serviceFundRequirements]);

  /**
   * Check if the agent has enough eth for initial funding
   */
  const hasEnoughNativeTokenForInitialFunding = useMemo(() => {
    if (isNil(serviceChainIds)) return;
    if (isEmpty(balancesByChain)) return;

    return serviceChainIds.every((chainId) => {
      const nativeTokenSymbol = getNativeTokenSymbol(chainId);
      const nativeTokenBalance =
        balancesByChain[chainId]?.[nativeTokenSymbol] || 0;
      const nativeTokenRequired =
        serviceFundRequirements[chainId]?.[nativeTokenSymbol] || 0;

      return nativeTokenBalance >= nativeTokenRequired;
    });
  }, [serviceChainIds, serviceFundRequirements, balancesByChain]);

  /**
   * Check if the agent has enough OLAS for initial funding
   */
  const hasEnoughOlasForInitialFunding = useMemo(() => {
    if (isNil(serviceChainIds)) return;
    if (isEmpty(balancesByChain)) return;

    return serviceChainIds.every((chainId) => {
      const olasBalance = balancesByChain[chainId]?.[TokenSymbol.OLAS] || 0;
      const olasRequired =
        serviceFundRequirements[chainId]?.[TokenSymbol.OLAS] || 0;

      return olasBalance >= olasRequired;
    });
  }, [serviceChainIds, serviceFundRequirements, balancesByChain]);

  /**
   * Check if the agent requires additional tokens and has enough for initial funding
   */
  const hasEnoughAdditionalTokensForInitialFunding = useMemo(() => {
    if (isNil(serviceChainIds)) return;
    if (isEmpty(balancesByChain)) return;

    return serviceChainIds.every((chainId) => {
      const nativeTokenSymbol = getNativeTokenSymbol(chainId);
      const additionalTokens = Object.keys(
        serviceFundRequirements[chainId],
      ).filter(
        (token) => token !== TokenSymbol.OLAS && token !== nativeTokenSymbol,
      );

      if (additionalTokens.length === 0) return true;

      return additionalTokens.every((tokenSymbol) => {
        const tokenBalance = balancesByChain[chainId]?.[tokenSymbol] || 0;
        const tokenRequired =
          serviceFundRequirements[chainId]?.[tokenSymbol] || 0;

        return tokenBalance >= tokenRequired;
      });
    });
  }, [serviceChainIds, serviceFundRequirements, balancesByChain]);

  /**
   * Check if the agent needs initial funding (both eth and olas)
   */
  const needsInitialFunding: boolean = useMemo(() => {
    if (isInitialFunded) return false;
    if (!isBalanceLoaded) return false;
    if (
      hasEnoughNativeTokenForInitialFunding &&
      hasEnoughOlasForInitialFunding &&
      hasEnoughAdditionalTokensForInitialFunding
    )
      return false;
    return true;
  }, [
    hasEnoughAdditionalTokensForInitialFunding,
    hasEnoughNativeTokenForInitialFunding,
    hasEnoughOlasForInitialFunding,
    isBalanceLoaded,
    isInitialFunded,
  ]);

  return {
    hasEnoughNativeTokenForInitialFunding,
    hasEnoughOlasForInitialFunding,
    hasEnoughAdditionalTokensForInitialFunding,
    balancesByChain,
    serviceFundRequirements,
    isInitialFunded,
    needsInitialFunding,
  };
};
