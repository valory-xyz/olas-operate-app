import { useEffect, useMemo } from 'react';

import { AddressBalanceRecord, MasterSafeBalanceRecord } from '@/client';
import { getTokenDetails } from '@/components/Bridge/utils';
import {
  ChainTokenConfig,
  getNativeTokenSymbol,
  TOKEN_CONFIG,
  TokenConfig,
} from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import {
  TokenSymbol,
  TokenSymbolConfigMap,
  TokenSymbolMap,
} from '@/constants/token';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { AgentConfig } from '@/types/Agent';
import { bigintMax } from '@/utils/calculations';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useBeforeBridgeFunds } from '../../Create/SetupEoaFunding/useBeforeBridgeFunds';
import { TokenRequirement } from '../TokensRequirements';

const getTokensDetailsForFunding = (
  requirementsPerToken: { [tokenAddress: Address]: string },
  evmHomeChainId: EvmChainId,
  chainConfig: ChainTokenConfig,
) => {
  const tokenRequirements: TokenRequirement[] = [];

  Object.entries(requirementsPerToken).forEach(([tokenAddress, amount]) => {
    let symbol: string, iconSrc: string, decimals: number;

    if (tokenAddress === AddressZero) {
      const nativeTokenSymbol = getNativeTokenSymbol(evmHomeChainId);
      const nativeTokenConfig = chainConfig[nativeTokenSymbol];
      symbol = nativeTokenSymbol;
      iconSrc = TokenSymbolConfigMap[nativeTokenSymbol].image;
      decimals = nativeTokenConfig.decimals;
    } else {
      const tokenDetails = getTokenDetails(
        tokenAddress,
        chainConfig,
      ) as TokenConfig;
      symbol = tokenDetails.symbol;
      iconSrc = TokenSymbolConfigMap[tokenDetails.symbol as TokenSymbol]?.image;
      decimals = tokenDetails.decimals;
    }

    if (symbol === TokenSymbolMap['XDAI']) {
      iconSrc = '/tokens/wxdai-icon.png';
    }

    const parsedAmount = formatUnitsToNumber(amount, decimals);

    if (parsedAmount > 0) {
      tokenRequirements.push({
        amount: parsedAmount,
        symbol,
        iconSrc,
      });
    }
  });

  return tokenRequirements.sort((a, b) => b.amount - a.amount);
};

export const useGetRefillRequimentsWithMonthlyGas = ({
  selectedAgentConfig,
  shouldCreateDummyService = false,
}: {
  selectedAgentConfig: AgentConfig;
  shouldCreateDummyService?: boolean;
}) => {
  const updateBeforeBridgingFunds = useBeforeBridgeFunds();
  const {
    refillRequirements,
    balances,
    refetch,
    isBalancesAndFundingRequirementsLoading,
  } = useBalanceAndRefillRequirementsContext();
  const { masterEoa } = useMasterWalletContext();

  useEffect(() => {
    const createDummyService = async () => {
      await updateBeforeBridgingFunds();
      await refetch?.();
    };
    if (shouldCreateDummyService) {
      createDummyService();
    }
  }, [updateBeforeBridgingFunds, refetch, shouldCreateDummyService]);

  const tokenRequirements = useMemo(() => {
    if (!masterEoa || isBalancesAndFundingRequirementsLoading) return;

    const { evmHomeChainId, middlewareHomeChainId } = selectedAgentConfig;
    const chainConfig = TOKEN_CONFIG[evmHomeChainId];

    // refill_requirements_masterEOA
    const masterEoaRequirementAmount = (
      refillRequirements as AddressBalanceRecord
    )[masterEoa.address]?.[AddressZero];

    // monthly_gas_estimate
    const monthlyGasEstimate = BigInt(
      SERVICE_TEMPLATES.find(
        (template) => template.home_chain === middlewareHomeChainId,
      )?.configurations[middlewareHomeChainId]?.monthly_gas_estimate ?? 0,
    );

    // native_token_amount in master_safe
    const nativeTokenBalanceInMasterSafe = BigInt(
      (balances as MasterSafeBalanceRecord)?.['master_safe']?.[AddressZero],
    );

    const requirementsPerToken = {} as { [tokenAddress: Address]: string };

    Object.entries(
      (refillRequirements as MasterSafeBalanceRecord)['master_safe'],
    )?.forEach(([tokenAddress, amount]) => {
      if (tokenAddress === AddressZero) {
        /**
         * If monthly gas estimate is greater than master_safe requirements, then consider that
         * else, check the native tokens required to meet the gas requirements
         */
        const masterSafeRequirementAmount = BigInt(amount);
        const gasDeficit = monthlyGasEstimate - nativeTokenBalanceInMasterSafe;
        const amountNeededForGas = bigintMax(0n, gasDeficit);
        const nativeTotalRequired =
          bigintMax(masterSafeRequirementAmount, amountNeededForGas) +
          BigInt(masterEoaRequirementAmount ?? 0);

        requirementsPerToken[tokenAddress as Address] =
          nativeTotalRequired.toString();
      } else {
        requirementsPerToken[tokenAddress as Address] = amount.toString();
      }
    });

    return getTokensDetailsForFunding(
      requirementsPerToken,
      evmHomeChainId,
      chainConfig,
    );
  }, [
    refillRequirements,
    masterEoa,
    selectedAgentConfig,
    isBalancesAndFundingRequirementsLoading,
    balances,
  ]);

  return {
    tokenRequirements,
    isLoading: isBalancesAndFundingRequirementsLoading,
  };
};
