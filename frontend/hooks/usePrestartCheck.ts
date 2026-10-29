import { useIsFetching, useQuery } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '@/constants';
import { ServicesService } from '@/service/Services';
import { PrestartCheckResult, ServiceConfigId } from '@/types';

/**
 * The prestart check as a query, so the start writes its result where the
 * alerts read it. A failed request is an `error` result, never a throw, so it
 * blocks the start like any other check that could not complete.
 */
export const prestartCheckQuery = (serviceConfigId: ServiceConfigId) => ({
  queryKey: REACT_QUERY_KEYS.PRESTART_CHECK_KEY(serviceConfigId),
  queryFn: async (): Promise<PrestartCheckResult> => {
    try {
      return await ServicesService.getPrestartCheck(serviceConfigId);
    } catch (error) {
      console.error('Prestart check request failed:', error);
      return { status: 'error', issues: [] };
    }
  },
  staleTime: 0,
});

export const isPrestartCheckBlocking = (result?: PrestartCheckResult) =>
  result?.status === 'failed' || result?.status === 'error';

/**
 * The last prestart check of a service, run by its last start attempt, and
 * whether one is running now. Never runs the check itself.
 */
export const usePrestartCheck = (serviceConfigId?: ServiceConfigId) => {
  const query = prestartCheckQuery(serviceConfigId ?? '');
  const { data } = useQuery({ ...query, enabled: false });
  const isChecking = useIsFetching({ queryKey: query.queryKey }) > 0;
  return { result: serviceConfigId ? data : undefined, isChecking };
};
