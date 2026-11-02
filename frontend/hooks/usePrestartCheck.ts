import { useIsFetching, useQuery } from '@tanstack/react-query';

import { REACT_QUERY_KEYS } from '@/constants';
import { ServicesService } from '@/service/Services';
import { PrestartCheckResult, ServiceConfigId } from '@/types';

/** `detail` is set when the request itself failed. */
export type PrestartCheck =
  | Exclude<PrestartCheckResult, { status: 'error' }>
  | { status: 'error'; issues: []; detail?: string };

export type BlockingPrestartCheck = Extract<
  PrestartCheck,
  { status: 'failed' | 'error' }
>;

/** A failed request resolves to `error`, so it blocks the start. */
export const prestartCheckQuery = (serviceConfigId: ServiceConfigId) => ({
  queryKey: REACT_QUERY_KEYS.PRESTART_CHECK_KEY(serviceConfigId),
  queryFn: async (): Promise<PrestartCheck> => {
    try {
      return await ServicesService.getPrestartCheck(serviceConfigId);
    } catch (error) {
      console.error(
        `Prestart check request failed for ${serviceConfigId}:`,
        error,
      );
      return {
        status: 'error',
        issues: [],
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  },
  staleTime: 0,
  gcTime: Infinity,
});

export const isPrestartCheckBlocking = (
  result?: PrestartCheck,
): result is BlockingPrestartCheck =>
  result?.status === 'failed' || result?.status === 'error';

/** The last start's prestart check of a service; never runs the check itself. */
export const usePrestartCheck = (serviceConfigId?: ServiceConfigId) => {
  const query = prestartCheckQuery(serviceConfigId ?? '');
  const { data } = useQuery({ ...query, enabled: false });
  const isChecking = useIsFetching({ queryKey: query.queryKey }) > 0;
  return { result: serviceConfigId ? data : undefined, isChecking };
};
