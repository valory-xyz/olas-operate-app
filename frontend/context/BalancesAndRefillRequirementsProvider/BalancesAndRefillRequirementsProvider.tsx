import {
  QueryObserverResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { entries, isEmpty } from 'lodash';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import {
  EvmChainId,
  MiddlewareDeploymentStatusMap,
  REACT_QUERY_KEYS,
  SIXTY_MINUTE_INTERVAL,
  THIRTY_SECONDS_INTERVAL,
} from '@/constants';
import {
  useDynamicRefetchInterval,
  useMasterWalletContext,
  useStore,
} from '@/hooks';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { usePageState } from '@/hooks/usePageState';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useServices } from '@/hooks/useServices';
import { BalanceService } from '@/service/Balance';
import {
  AddressBalanceRecord,
  BalancesAndFundingRequirements,
  MasterSafeBalanceRecord,
  Maybe,
  Optional,
} from '@/types';
import {
  asMiddlewareChain,
  BACKOFF_STEPS,
  getExponentialInterval,
} from '@/utils';

export const BalancesAndRefillRequirementsProviderContext = createContext<{
  isBalancesAndFundingRequirementsLoading: boolean;
  refillRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  getRefillRequirementsOf: (
    chainId: EvmChainId,
    serviceConfigId?: string,
  ) => Maybe<AddressBalanceRecord>;
  totalRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  agentFundingRequests: Optional<AddressBalanceRecord>;
  canStartAgent: boolean;
  isRefillRequired: boolean;
  isAgentFundingRequestsStale: boolean;
  isPearlWalletRefillRequired: boolean;
  refetch: () => Promise<
    [
      QueryObserverResult<BalancesAndFundingRequirements, Error>,
      QueryObserverResult<
        Record<string, BalancesAndFundingRequirements>,
        Error
      >,
    ]
  >;
  refetchForSelectedAgent: () => Promise<
    QueryObserverResult<BalancesAndFundingRequirements, Error>
  >;
  resetQueryCache: () => void;
}>({
  isBalancesAndFundingRequirementsLoading: false,
  refillRequirements: undefined,
  getRefillRequirementsOf: () => null,
  totalRequirements: undefined,
  agentFundingRequests: undefined,
  canStartAgent: false,
  isRefillRequired: true,
  isAgentFundingRequestsStale: false,
  isPearlWalletRefillRequired: false,
  refetch: () =>
    Promise.resolve([
      {} as QueryObserverResult<BalancesAndFundingRequirements, Error>,
      {} as QueryObserverResult<
        Record<string, BalancesAndFundingRequirements>,
        Error
      >,
    ]),
  refetchForSelectedAgent: () =>
    Promise.resolve(
      {} as QueryObserverResult<BalancesAndFundingRequirements, Error>,
    ),
  resetQueryCache: () => {},
});

/**
 * Determines polling interval for balances and funding requirements.
 *
 * Logic:
 * - If funding data is unreliable (in progress or cooldown), poll every 30s.
 * - If the service runs and is not yet eligible for rewards, use gradual backoff.
 * - Otherwise, refresh once per hour.
 *
 * @returns
 * - refetchInterval: ms or disabled
 * - updateRefetchCounter: callback to update internal backoff and reliability flags
 */
const useRequirementsFetchInterval = ({
  configId,
  isServiceRunning,
  isEligibleForRewards,
}: {
  configId: Optional<string>;
  isServiceRunning: boolean;
  isEligibleForRewards: Optional<boolean>;
}) => {
  // Exponential backoff for active agent
  const refetchCountRef = useRef(0);

  // Whether we should refetch requirements more frequently
  // because they are stale
  const isAgentFundingRequestsStaleRef = useRef(false);

  // Reset refetch count when service stops running
  useEffect(() => {
    if (!isServiceRunning) {
      refetchCountRef.current = 0;
    }
  }, [isServiceRunning]);

  const refetchInterval = useMemo<number | false>(() => {
    if (!configId) return false;

    if (isAgentFundingRequestsStaleRef.current) {
      return THIRTY_SECONDS_INTERVAL;
    }

    if (isServiceRunning && !isEligibleForRewards) {
      return getExponentialInterval(refetchCountRef.current);
    }

    return SIXTY_MINUTE_INTERVAL;
  }, [isServiceRunning, isEligibleForRewards, configId]);

  const updateRefetchCounter = (data: BalancesAndFundingRequirements) => {
    // Update data stale ref
    isAgentFundingRequestsStaleRef.current =
      data.agent_funding_in_progress || data.agent_funding_requests_cooldown;

    // Update backoff counter
    if (isServiceRunning && !isEligibleForRewards) {
      refetchCountRef.current = Math.min(
        refetchCountRef.current + 1,
        BACKOFF_STEPS - 1,
      );
    } else {
      refetchCountRef.current = 0;
    }
  };

  return { refetchInterval, updateRefetchCounter };
};

export const BalancesAndRefillRequirementsProvider = ({
  children,
}: PropsWithChildren) => {
  const queryClient = useQueryClient();
  const { storeState } = useStore();
  const { isOnline } = useOnlineStatusContext();
  const { isUserLoggedIn } = usePageState();
  const { masterSafes } = useMasterWalletContext();
  const {
    services,
    selectedService,
    selectedAgentConfig,
    availableServiceConfigIds,
  } = useServices();
  const { isEligibleForRewards } = useRewardContext();
  const configId = selectedService?.service_config_id;
  const chainId = selectedAgentConfig.evmHomeChainId;

  const isServiceRunning =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYED;

  const { refetchInterval: backoffRefetchInterval, updateRefetchCounter } =
    useRequirementsFetchInterval({
      configId,
      isServiceRunning,
      isEligibleForRewards,
    });
  const refetchInterval = useDynamicRefetchInterval(backoffRefetchInterval);

  const {
    data: balancesAndFundingRequirements,
    isLoading: isBalancesAndFundingRequirementsLoading,
    refetch: refetchBalancesAndFundingRequirements,
  } = useQuery<BalancesAndFundingRequirements>({
    queryKey: REACT_QUERY_KEYS.BALANCES_AND_REFILL_REQUIREMENTS_KEY(
      configId as string,
    ),
    queryFn: async ({ signal }) => {
      const data = await BalanceService.getBalancesAndFundingRequirements({
        serviceConfigId: configId!,
        signal,
      });

      updateRefetchCounter(data);
      return data;
    },
    enabled: !!configId && isUserLoggedIn && isOnline,
    refetchInterval,
  });

  const serviceConfigIds = useMemo(
    () => availableServiceConfigIds.map(({ configId }) => configId),
    [availableServiceConfigIds],
  );

  const {
    data: balancesAndFundingRequirementsForAllServices,
    isLoading: isBalancesAndFundingRequirementsLoadingForAllServices,
    refetch: refetchBalancesAndFundingRequirementsForAllServices,
  } = useQuery({
    queryKey:
      REACT_QUERY_KEYS.ALL_BALANCES_AND_REFILL_REQUIREMENTS_KEY(
        serviceConfigIds,
      ),
    queryFn: ({ signal }) =>
      BalanceService.getAllBalancesAndFundingRequirements({
        serviceConfigIds,
        signal,
      }),
    enabled: !!serviceConfigIds.length && isUserLoggedIn && isOnline,
    refetchInterval,
  });

  const getRefillRequirementsOf = useCallback(
    <T extends AddressBalanceRecord | MasterSafeBalanceRecord>(
      chainId: EvmChainId,
      serviceConfigId?: string,
    ): Optional<T> => {
      if (!serviceConfigId) return;
      if (isBalancesAndFundingRequirementsLoadingForAllServices) return;
      if (!balancesAndFundingRequirementsForAllServices) return;

      const chain = asMiddlewareChain(chainId);
      const currentServiceBalancesAndFundingRequirements: Optional<BalancesAndFundingRequirements> =
        balancesAndFundingRequirementsForAllServices?.[serviceConfigId];
      if (!currentServiceBalancesAndFundingRequirements) return;

      const result = currentServiceBalancesAndFundingRequirements
        .refill_requirements[chain] as Optional<T>;
      return result;
    },
    [
      isBalancesAndFundingRequirementsLoadingForAllServices,
      balancesAndFundingRequirementsForAllServices,
    ],
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
    balancesAndFundingRequirements,
    chainId,
  ]);

  const agentFundingRequests = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return;
    if (!balancesAndFundingRequirements) return;

    /** @warning If an agent requires funds on different chains, this will work incorrectly */
    return balancesAndFundingRequirements.agent_funding_requests[
      asMiddlewareChain(chainId)
    ];
  }, [
    isBalancesAndFundingRequirementsLoading,
    chainId,
    balancesAndFundingRequirements,
  ]);

  const resetQueryCache = useCallback(() => {
    if (!configId) return;

    queryClient.removeQueries({
      queryKey: REACT_QUERY_KEYS.BALANCES_AND_REFILL_REQUIREMENTS_KEY(configId),
    });
  }, [queryClient, configId]);

  const isPearlWalletRefillRequired = useMemo(() => {
    // If master safes are empty, no agent is set up, hence no refill is required.
    if (isEmpty(masterSafes)) return false;
    if (isEmpty(services)) return false;
    if (isEmpty(balancesAndFundingRequirementsForAllServices)) return false;

    // Check if any agent requires a refill on any chain
    return entries(balancesAndFundingRequirementsForAllServices)
      .map(([serviceConfigId, data]) => {
        const currentService = services?.find(
          (service) => service.service_config_id === serviceConfigId,
        );
        if (!currentService) return false;

        const agentConfig = ACTIVE_AGENTS.find(
          ([, agentConfig]) =>
            agentConfig.servicePublicId === currentService?.service_public_id &&
            agentConfig.middlewareHomeChainId === currentService?.home_chain,
        );
        if (!agentConfig) return false;

        const agentType = agentConfig[0];

        // Check if initial funding is done for this agent
        // and only then consider refill requirement
        return (
          data.is_refill_required && !!storeState?.[agentType]?.isInitialFunded
        );
      })
      .some((isRefillRequired) => isRefillRequired);
  }, [
    balancesAndFundingRequirementsForAllServices,
    masterSafes,
    storeState,
    services,
  ]);

  const refetch = useCallback(async () => {
    return Promise.all([
      refetchBalancesAndFundingRequirements(),
      refetchBalancesAndFundingRequirementsForAllServices(),
    ]);
  }, [
    refetchBalancesAndFundingRequirements,
    refetchBalancesAndFundingRequirementsForAllServices,
  ]);

  return (
    <BalancesAndRefillRequirementsProviderContext.Provider
      value={{
        isBalancesAndFundingRequirementsLoading,
        refillRequirements,
        getRefillRequirementsOf,
        totalRequirements,
        agentFundingRequests,
        canStartAgent:
          balancesAndFundingRequirements?.allow_start_agent || false,
        isRefillRequired:
          balancesAndFundingRequirements?.is_refill_required || true,
        isAgentFundingRequestsStale:
          balancesAndFundingRequirements?.agent_funding_in_progress ||
          balancesAndFundingRequirements?.agent_funding_requests_cooldown ||
          false,
        isPearlWalletRefillRequired,
        refetch,
        refetchForSelectedAgent: refetchBalancesAndFundingRequirements,
        resetQueryCache,
      }}
    >
      {children}
    </BalancesAndRefillRequirementsProviderContext.Provider>
  );
};
