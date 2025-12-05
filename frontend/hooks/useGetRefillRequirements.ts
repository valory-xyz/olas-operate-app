import { isEmpty } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ChainTokenConfig, TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { AddressZero } from '@/constants/address';
import { MASTER_SAFE_REFILL_PLACEHOLDER } from '@/constants/defaults';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { TokenSymbolConfigMap, TokenSymbolMap } from '@/constants/token';
import { useServices } from '@/hooks';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useMasterWalletContext } from '@/hooks/useWallet';
import {
  AddressBalanceRecord,
  MasterSafeBalanceRecord,
  TokenRequirement,
} from '@/types';
import { Address } from '@/types/Address';
import { getTokenDetails } from '@/utils';
import { formatUnitsToNumber } from '@/utils/numberFormatters';
import { onDummyServiceCreation } from '@/utils/service';

/**
 * Hook to run actions before bridging funds screen.
 * For predict agent, it creates a dummy service & then navigates to the bridge onboarding.
 */
const useBeforeBridgeFunds = () => {
  const { defaultStakingProgramId } = useStakingProgram();
  const {
    selectedAgentType,
    selectedService,
    refetch: refetchServices,
  } = useServices();

  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  return useCallback(async () => {
    // If a service is already selected, do not create a service
    if (selectedService) return;

    if (!defaultStakingProgramId) {
      throw new Error('Default staking program ID unavailable');
    }

    if (!serviceTemplate) {
      throw new Error('Service template unavailable');
    }

    await onDummyServiceCreation(defaultStakingProgramId, serviceTemplate);

    // fetch services again to update the state after service creation
    await refetchServices?.();

    // For other agents, just navigate to bridge onboarding as
    // service creation is already handled in the agent setup.
  }, [
    defaultStakingProgramId,
    serviceTemplate,
    selectedService,
    refetchServices,
  ]);
};

const ICON_OVERRIDES: Record<string, string> = {
  [TokenSymbolMap['XDAI']]: '/tokens/wxdai-icon.png',
};

const getTokenMeta = (tokenAddress: Address, chainConfig: ChainTokenConfig) => {
  const tokenDetails = getTokenDetails(
    tokenAddress,
    chainConfig,
  ) as TokenConfig;

  return {
    symbol: tokenDetails.symbol,
    decimals: tokenDetails.decimals,
    iconSrc: TokenSymbolConfigMap[tokenDetails.symbol].image || '',
  };
};

const getTokensDetailsForFunding = (
  requirementsPerToken: { [tokenAddress: Address]: bigint },
  chainConfig: ChainTokenConfig,
) => {
  const currentTokenRequirements: TokenRequirement[] = Object.entries(
    requirementsPerToken,
  )
    .map(([tokenAddress, amount]) => {
      const { symbol, decimals, iconSrc } = getTokenMeta(
        tokenAddress as Address,
        chainConfig,
      );
      const parsedAmount = formatUnitsToNumber(amount, decimals);

      if (parsedAmount > 0) {
        return {
          amount: parsedAmount,
          symbol,
          iconSrc: ICON_OVERRIDES[symbol] || iconSrc,
        };
      }
    })
    .filter(Boolean) as TokenRequirement[];

  return currentTokenRequirements.sort((a, b) => b.amount - a.amount);
};

type UseGetRefillRequirementsProps = {
  shouldCreateDummyService?: boolean;
};

type UseGetRefillRequirementsReturn = {
  /**
   * Total token requirements, doesn't consider the eoa balances. This is what we show on the
   * funding cards (fund your agent screen)
   */
  totalTokenRequirements: TokenRequirement[];
  /**
   * Initial token requirements, calculated when the funds are requested for the first time,
   * considers the eoa balances. This is the actual funds that user has to send in order to meet the
   * initial funding requirements.
   */
  initialTokenRequirements: TokenRequirement[];
  isLoading: boolean;
  resetTokenRequirements: () => void;
};

/**
 *
 * Hook to get the refill requirements for the selectedAgent.
 *
 * Computes actual refill/funding amounts based on refill/total
 * requirements from BE taking into account current balances on agent's chain
 *
 * Creates dummy service if needed
 *
 * @example
 * {
 *   totalTokenRequirements: [
 *     {
 *       amount: 0.5,
 *       symbol: "XDAI",
 *       iconSrc: "/tokens/wxdai-icon.png"
 *     },
 *     {
 *       amount: 100,
 *       symbol: "USDC",
 *       iconSrc: "/tokens/usdc-icon.png"
 *     }
 *   ],
 *   initialTokenRequirements: [...],
 *   isLoading: false
 * }
 */
export const useGetRefillRequirements = ({
  shouldCreateDummyService = false,
}: UseGetRefillRequirementsProps = {}): UseGetRefillRequirementsReturn => {
  const updateBeforeBridgingFunds = useBeforeBridgeFunds();
  const {
    totalRequirements,
    refillRequirements,
    refetch,
    resetQueryCache,
    isBalancesAndFundingRequirementsLoading,
  } = useBalanceAndRefillRequirementsContext();
  const {
    masterEoa,
    getMasterSafeOf,
    isFetched: isMasterWalletsFetched,
  } = useMasterWalletContext();
  const { selectedAgentConfig, selectedAgentType } = useServices();

  const [isDummyServiceCreated, setIsDummyServiceCreated] = useState(false);
  const [initialTokenRequirements, setInitialTokenRequirements] = useState<
    TokenRequirement[] | null
  >(null);
  const [totalTokenRequirements, setTotalTokenRequirements] = useState<
    TokenRequirement[] | null
  >(null);

  const masterSafe = useMemo(
    () => getMasterSafeOf?.(selectedAgentConfig.evmHomeChainId),
    [getMasterSafeOf, selectedAgentConfig.evmHomeChainId],
  );

  const getRequirementsPerToken = useCallback(
    (
      requirements: AddressBalanceRecord | MasterSafeBalanceRecord | undefined,
    ) => {
      if (
        isBalancesAndFundingRequirementsLoading ||
        !requirements ||
        !masterEoa ||
        !isMasterWalletsFetched
      )
        return [];

      const masterSafeRequirements = masterSafe
        ? (requirements as AddressBalanceRecord)?.[masterSafe.address]
        : (requirements as MasterSafeBalanceRecord)?.[
            MASTER_SAFE_REFILL_PLACEHOLDER
          ];

      if (!masterSafeRequirements) return [];

      const { evmHomeChainId } = selectedAgentConfig;
      const chainConfig = TOKEN_CONFIG[evmHomeChainId];

      // Refill requirements for masterEOA
      const masterEoaRequirementAmount = (requirements as AddressBalanceRecord)[
        masterEoa.address
      ]?.[AddressZero];

      const requirementsPerToken: { [tokenAddress: Address]: bigint } = {};

      Object.entries(masterSafeRequirements)?.forEach(
        ([tokenAddress, amount]) => {
          if (tokenAddress === AddressZero) {
            // Refill requirements for masterSafe
            const masterSafeRequirementAmount = BigInt(amount);
            // Calculate the total native token requirement for gas (master safe + master EOA)
            const nativeTotalRequired =
              masterSafeRequirementAmount +
              BigInt(masterEoaRequirementAmount ?? 0);

            requirementsPerToken[tokenAddress as Address] = nativeTotalRequired;
          } else {
            requirementsPerToken[tokenAddress as Address] = BigInt(amount);
          }
        },
      );

      return getTokensDetailsForFunding(requirementsPerToken, chainConfig);
    },
    [
      isBalancesAndFundingRequirementsLoading,
      isMasterWalletsFetched,
      masterEoa,
      masterSafe,
      selectedAgentConfig,
    ],
  );

  useEffect(() => {
    const createDummyService = async () => {
      await updateBeforeBridgingFunds();
      await refetch();
      setIsDummyServiceCreated(true);
    };

    if (shouldCreateDummyService && !isDummyServiceCreated) {
      createDummyService();
    }
  }, [
    updateBeforeBridgingFunds,
    refetch,
    shouldCreateDummyService,
    isDummyServiceCreated,
  ]);

  /**
   * Reset the token requirements and query cache manually so the user
   * doesn't see stale values / values from other agents.
   */
  const resetTokenRequirements = useCallback(
    (resetCache = true) => {
      setTotalTokenRequirements(null);
      setInitialTokenRequirements(null);
      if (resetCache) resetQueryCache?.();
    },
    [resetQueryCache],
  );

  /**
   * @important Reset the token requirements when the selected agent type changes.
   */
  useEffect(() => {
    resetTokenRequirements(false);
  }, [selectedAgentType, resetTokenRequirements]);

  const currentTokenRequirements = useMemo(() => {
    return getRequirementsPerToken(refillRequirements);
  }, [getRequirementsPerToken, refillRequirements]);

  // Capture the initial token requirements once, when they are first available
  useEffect(() => {
    if (!initialTokenRequirements && currentTokenRequirements.length) {
      setInitialTokenRequirements(currentTokenRequirements);
    }
  }, [currentTokenRequirements, initialTokenRequirements]);

  // Get the total token requirements
  useEffect(() => {
    if (isEmpty(totalTokenRequirements)) {
      setTotalTokenRequirements(getRequirementsPerToken(totalRequirements));
    }
  }, [totalRequirements, getRequirementsPerToken, totalTokenRequirements]);

  return {
    isLoading:
      isBalancesAndFundingRequirementsLoading || !totalTokenRequirements,
    initialTokenRequirements:
      initialTokenRequirements ?? currentTokenRequirements,
    totalTokenRequirements: totalTokenRequirements || [],
    resetTokenRequirements,
  };
};
