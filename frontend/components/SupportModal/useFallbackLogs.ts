import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { REACT_QUERY_KEYS } from '@/constants';
import { ServicesService } from '@/service/Services';
import { MiddlewareServiceResponse } from '@/types';

const RETRY_COUNT = 1;
const STALE_TIME = 30_000;

/**
 * A fallback hook that fetches required debug data directly via API.
 * Use this when context providers are not available (e.g., in ErrorBoundary fallback).
 * Uses the same query keys as regular providers to leverage react-query cache.
 */
export const useFallbackLogs = () => {
  const { data: services, isFetched: isServicesFetched } = useQuery<
    MiddlewareServiceResponse[]
  >({
    queryKey: REACT_QUERY_KEYS.SERVICES_KEY,
    queryFn: () => ServicesService.getServices(),
    retry: RETRY_COUNT,
    staleTime: STALE_TIME,
  });

  const formattedServices = useMemo(() => {
    return services?.map((service) => ({
      ...service,
      keys: service.keys?.map((key) => key.address),
    }));
  }, [services]);

  const logs = useMemo(() => {
    return {
      debugData: {
        services: isServicesFetched ? { services: formattedServices } : null,
        wallets: [],
        balances: [],
      },
    };
  }, [isServicesFetched, formattedServices]);

  return logs;
};
