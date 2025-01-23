import { useQuery } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useMemo } from 'react';

import { AddressBalanceRecord, BalancesAndFundingRequirements } from '@/client';
import {
  FIVE_SECONDS_INTERVAL,
  ONE_MINUTE_INTERVAL,
} from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { BalanceService } from '@/service/balances';
import { Optional } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

export const BalancesAndRefillRequirementsProviderContext = createContext<{
  isBalancesAndFundingRequirementsLoading: boolean;
  balances: Optional<AddressBalanceRecord>;
  refillRequirements: Optional<AddressBalanceRecord>;
  canStartAgent: boolean;
}>({
  isBalancesAndFundingRequirementsLoading: false,
  balances: undefined,
  refillRequirements: undefined,
  canStartAgent: false,
});

export const BalancesAndRefillRequirementsProvider = ({
  children,
}: PropsWithChildren) => {
  const { isUserLoggedIn } = usePageState();
  const { selectedService, selectedAgentConfig } = useServices();
  const configId = selectedService?.service_config_id;
  const chainId = selectedAgentConfig.evmHomeChainId;

  const { isServiceRunning } = useService(configId);

  const refetchInterval = useMemo(() => {
    if (!configId) return false;

    // If the service is running, we can afford to check balances less frequently
    if (isServiceRunning) return ONE_MINUTE_INTERVAL;

    return FIVE_SECONDS_INTERVAL;
  }, [isServiceRunning, configId]);

  const {
    data: balancesAndRefillRequirements,
    isLoading: isBalancesAndFundingRequirementsLoading,
  } = useQuery<BalancesAndFundingRequirements>({
    queryKey: REACT_QUERY_KEYS.BALANCES_AND_REFILL_REQUIREMENTS_KEY(
      configId as string,
    ),
    queryFn: () =>
      BalanceService.getBalancesAndRefillRequirements(configId as string),
    enabled: !!configId && isUserLoggedIn,
    refetchInterval,
  });

  const balances = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balancesAndRefillRequirements) return;

    return balancesAndRefillRequirements.balances[asMiddlewareChain(chainId)];
  }, [
    balancesAndRefillRequirements,
    chainId,
    isBalancesAndFundingRequirementsLoading,
  ]);

  const refillRequirements = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balancesAndRefillRequirements) return;

    return balancesAndRefillRequirements.refill_requirements[
      asMiddlewareChain(chainId)
    ];
  }, [
    balancesAndRefillRequirements,
    chainId,
    isBalancesAndFundingRequirementsLoading,
  ]);

  return (
    <BalancesAndRefillRequirementsProviderContext.Provider
      value={{
        isBalancesAndFundingRequirementsLoading,
        refillRequirements,
        balances,
        canStartAgent:
          balancesAndRefillRequirements?.allow_start_agent || false,
      }}
    >
      {children}
    </BalancesAndRefillRequirementsProviderContext.Provider>
  );
};
