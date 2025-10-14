import {
  QueryObserverResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { isEmpty } from 'lodash';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import {
  AddressBalanceRecord,
  BalancesAndFundingRequirements,
  MasterSafeBalanceRecord,
} from '@/client';
import { EvmChainId, MiddlewareDeploymentStatusMap } from '@/constants';
import {
  SIXTY_MINUTE_INTERVAL,
  THIRTY_SECONDS_INTERVAL,
} from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { useMasterWalletContext } from '@/hooks';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { usePageState } from '@/hooks/usePageState';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useServices } from '@/hooks/useServices';
import { BalanceService } from '@/service/balances';
import { Maybe, Nullable, Optional } from '@/types/Util';
import { getExponentialInterval } from '@/utils';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

export const BalancesAndRefillRequirementsProviderContext = createContext<{
  isBalancesAndFundingRequirementsLoading: boolean;
  balances: Optional<AddressBalanceRecord>;
  refillRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  getRefillRequirementsOf: (chainId: EvmChainId) => Maybe<AddressBalanceRecord>;
  totalRequirements: Optional<AddressBalanceRecord | MasterSafeBalanceRecord>;
  agentFundingRequests: Optional<AddressBalanceRecord>;
  canStartAgent: boolean;
  isAgentFundingRequestsStale: boolean;
  isPearlWalletRefillRequired: boolean;
  refetch: Nullable<
    () => Promise<QueryObserverResult<BalancesAndFundingRequirements, Error>>
  >;
  resetQueryCache: () => void;
}>({
  isBalancesAndFundingRequirementsLoading: false,
  balances: undefined,
  refillRequirements: undefined,
  getRefillRequirementsOf: () => null,
  totalRequirements: undefined,
  agentFundingRequests: undefined,
  canStartAgent: false,
  isAgentFundingRequestsStale: false,
  isPearlWalletRefillRequired: false,
  refetch: null,
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
      refetchCountRef.current = Math.min(refetchCountRef.current + 1, 4);
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
  const { isOnline } = useOnlineStatusContext();
  const { isUserLoggedIn } = usePageState();
  const { masterSafes } = useMasterWalletContext();
  const { services, selectedService, selectedAgentConfig } = useServices();
  const { isEligibleForRewards } = useRewardContext();
  const configId = selectedService?.service_config_id;
  const chainId = selectedAgentConfig.evmHomeChainId;

  const isServiceRunning =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYED;

  const { refetchInterval, updateRefetchCounter } =
    useRequirementsFetchInterval({
      configId,
      isServiceRunning,
      isEligibleForRewards,
    });

  const {
    data: balancesAndFundingRequirements,
    isLoading: isBalancesAndFundingRequirementsLoading,
    refetch,
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
    () => services?.map((s) => s.service_config_id) ?? [],
    [services],
  );

  const {
    data: balancesAndFundingRequirementsForAllServices,
    isLoading: isBalancesAndFundingRequirementsLoadingForAllServices,
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
    enabled: !!services?.length && isUserLoggedIn && isOnline,
    refetchInterval: THIRTY_SECONDS_INTERVAL,
  });

  console.log({
    balancesAndFundingRequirementsForAllServices,
    isBalancesAndFundingRequirementsLoadingForAllServices,
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
      if (isBalancesAndFundingRequirementsLoadingForAllServices) return;
      if (!balancesAndFundingRequirementsForAllServices) return;

      const chain = asMiddlewareChain(chainId);
      const serviceIdOfService = services?.find(
        (s) => s.home_chain === chain,
      )?.service_config_id;
      if (!serviceIdOfService) return;

      // console.log({ chain, serviceIdOfService });

      const currentServiceBalancesAndFundingRequirements: Optional<BalancesAndFundingRequirements> =
        balancesAndFundingRequirementsForAllServices?.[serviceIdOfService];
      if (!currentServiceBalancesAndFundingRequirements) return;

      const result = currentServiceBalancesAndFundingRequirements
        .refill_requirements[chain] as Optional<T>;
      return result;
      // console.log(result);
    },
    [
      isBalancesAndFundingRequirementsLoadingForAllServices,
      balancesAndFundingRequirementsForAllServices,
      services,
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

  const resetQueryCache = useCallback(() => {
    if (!configId) return;

    queryClient.removeQueries({
      queryKey: REACT_QUERY_KEYS.BALANCES_AND_REFILL_REQUIREMENTS_KEY(configId),
    });
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
        isAgentFundingRequestsStale:
          balancesAndFundingRequirements?.agent_funding_in_progress ||
          balancesAndFundingRequirements?.agent_funding_requests_cooldown ||
          false,
        isPearlWalletRefillRequired,
        refetch: refetch || null,
        resetQueryCache,
      }}
    >
      {children}
    </BalancesAndRefillRequirementsProviderContext.Provider>
  );
};
