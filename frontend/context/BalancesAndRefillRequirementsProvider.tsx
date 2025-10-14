import {
  QueryObserverResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { isEmpty } from 'lodash';
import { createContext, PropsWithChildren, useCallback, useMemo } from 'react';

import {
  AddressBalanceRecord,
  BalancesAndFundingRequirements,
  MasterSafeBalanceRecord,
} from '@/client';
import { EvmChainId } from '@/constants';
import {
  FIVE_SECONDS_INTERVAL,
  ONE_MINUTE_INTERVAL,
} from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { useMasterWalletContext } from '@/hooks';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { BalanceService } from '@/service/balances';
import { Maybe, Nullable, Optional } from '@/types/Util';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

export const BalancesAndRefillRequirementsProviderContext = createContext<{
  isBalancesAndFundingRequirementsLoading: boolean;
  balances: Optional<AddressBalanceRecord>;
  refillRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  getRefillRequirementsOf: (chainId: EvmChainId) => Maybe<AddressBalanceRecord>;
  totalRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  agentFundingRequests: Optional<AddressBalanceRecord>;
  canStartAgent: boolean;
  isPearlWalletRefillRequired: boolean;
  refetch: Nullable<
    () => Promise<QueryObserverResult<BalancesAndFundingRequirements, Error>>
  >;
  resetQueryCache: Nullable<() => Promise<void>>;
}>({
  isBalancesAndFundingRequirementsLoading: false,
  balances: undefined,
  refillRequirements: undefined,
  getRefillRequirementsOf: () => null,
  totalRequirements: undefined,
  agentFundingRequests: undefined,
  canStartAgent: false,
  isPearlWalletRefillRequired: false,
  refetch: null,
  resetQueryCache: null,
});

export const BalancesAndRefillRequirementsProvider = ({
  children,
}: PropsWithChildren) => {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatusContext();
  const { isUserLoggedIn } = usePageState();
  const { masterSafes } = useMasterWalletContext();
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
  const getRefillRequirementsOf = useCallback(
    <T extends AddressBalanceRecord | MasterSafeBalanceRecord>(
      chainId: EvmChainId,
    ): Optional<T> => {
      if (isBalancesAndFundingRequirementsLoading) return;
      if (!balancesAndFundingRequirements) return;

      const chain = asMiddlewareChain(chainId);
      return balancesAndFundingRequirements.refill_requirements[chain] as T;
    },
    [isBalancesAndFundingRequirementsLoading, balancesAndFundingRequirements],
  );

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

  const isPearlWalletRefillRequired = useMemo(() => {
    // If master safes are empty, no service is set up, hence no refill is required.
    if (isEmpty(masterSafes)) return false;

    return balancesAndFundingRequirements?.is_refill_required || false;
  }, [balancesAndFundingRequirements?.is_refill_required, masterSafes]);

  return (
    <BalancesAndRefillRequirementsProviderContext.Provider
      value={{
        isBalancesAndFundingRequirementsLoading,
        refillRequirements,
        getRefillRequirementsOf,
        balances,
        totalRequirements,
        agentFundingRequests,
        canStartAgent:
          balancesAndFundingRequirements?.allow_start_agent || false,
        isPearlWalletRefillRequired,
        refetch: refetch || null,
        resetQueryCache,
      }}
    >
      {children}
    </BalancesAndRefillRequirementsProviderContext.Provider>
  );
};
