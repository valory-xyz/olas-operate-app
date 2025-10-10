import {
  QueryObserverResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createContext, PropsWithChildren, useMemo } from 'react';

import {
  AddressBalanceRecord,
  BalancesAndFundingRequirements,
  MasterSafeBalanceRecord,
} from '@/client';
import {
  FIVE_SECONDS_INTERVAL,
  ONE_MINUTE_INTERVAL,
} from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { BalanceService } from '@/service/balances';
import { Nullable, Optional } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

export const BalancesAndRefillRequirementsProviderContext = createContext<{
  isBalancesAndFundingRequirementsLoading: boolean;
  balances: Optional<AddressBalanceRecord>;
  refillRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  totalRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  agentFundingRequests: Optional<AddressBalanceRecord>;
  canStartAgent: boolean;
  isRefillRequired: boolean;
  refetch: Nullable<
    () => Promise<QueryObserverResult<BalancesAndFundingRequirements, Error>>
  >;
  resetQueryCache: Nullable<() => Promise<void>>;
}>({
  isBalancesAndFundingRequirementsLoading: false,
  balances: undefined,
  refillRequirements: undefined,
  totalRequirements: undefined,
  agentFundingRequests: undefined,
  canStartAgent: false,
  isRefillRequired: false,
  refetch: null,
  resetQueryCache: null,
});

export const BalancesAndRefillRequirementsProvider = ({
  children,
}: PropsWithChildren) => {
  const { isUserLoggedIn } = usePageState();
  const { selectedService, selectedAgentConfig } = useServices();
  const { isOnline } = useOnlineStatusContext();
  const queryClient = useQueryClient();
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
    data: balancesAndFundingRequirements,
    isLoading: isBalancesAndFundingRequirementsLoading,
    refetch,
  } = useQuery<BalancesAndFundingRequirements>({
    queryKey: REACT_QUERY_KEYS.BALANCES_AND_REFILL_REQUIREMENTS_KEY(
      configId as string,
    ),
    queryFn: ({ signal }) =>
      BalanceService.getBalancesAndFundingRequirements({
        serviceConfigId: configId!,
        signal,
      }),
    enabled: !!configId && isUserLoggedIn && isOnline,
    refetchInterval,
  });

  const balances = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balancesAndFundingRequirements) return;

    return balancesAndFundingRequirements.balances[asMiddlewareChain(chainId)];
  }, [
    isBalancesAndFundingRequirementsLoading,
    chainId,
    balancesAndFundingRequirements,
  ]);

  const refillRequirements = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balancesAndFundingRequirements) return;

    return balancesAndFundingRequirements.refill_requirements[
      asMiddlewareChain(chainId)
    ];
  }, [
    isBalancesAndFundingRequirementsLoading,
    chainId,
    balancesAndFundingRequirements,
  ]);

  const totalRequirements = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balancesAndFundingRequirements) return;

    return balancesAndFundingRequirements.total_requirements[
      asMiddlewareChain(chainId)
    ];
  }, [
    isBalancesAndFundingRequirementsLoading,
    chainId,
    balancesAndFundingRequirements,
  ]);

  const agentFundingRequests = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balancesAndFundingRequirements) return;

    // WARNING: If an agent requires funds on different chains, this will work incorrectly
    return balancesAndFundingRequirements.agent_funding_requests[
      asMiddlewareChain(chainId)
    ];
  }, [
    isBalancesAndFundingRequirementsLoading,
    chainId,
    balancesAndFundingRequirements,
  ]);

  const resetQueryCache = useMemo(() => {
    if (!configId) return null;

    return async () => {
      // Invalidate the query
      await queryClient.removeQueries({
        queryKey:
          REACT_QUERY_KEYS.BALANCES_AND_REFILL_REQUIREMENTS_KEY(configId),
      });
    };
  }, [queryClient, configId]);

  return (
    <BalancesAndRefillRequirementsProviderContext.Provider
      value={{
        isBalancesAndFundingRequirementsLoading,
        refillRequirements,
        balances,
        totalRequirements,
        agentFundingRequests,
        canStartAgent:
          balancesAndFundingRequirements?.allow_start_agent || false,
        isRefillRequired:
          balancesAndFundingRequirements?.is_refill_required || false,
        refetch: refetch || null,
        resetQueryCache,
      }}
    >
      {children}
    </BalancesAndRefillRequirementsProviderContext.Provider>
  );
};
