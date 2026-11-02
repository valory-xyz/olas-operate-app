import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { AgentType, REACT_QUERY_KEYS } from '@/constants';
import { useLogAutoRunEvent } from '@/context/AutoRunProvider/hooks/useLogAutoRunEvent';
import { getAgentFromService } from '@/context/AutoRunProvider/utils/utils';
import { FundingRunService } from '@/service/FundingRun';

import { useIsInitiallyFunded } from './useIsInitiallyFunded';
import { useOnlineStatusContext } from './useOnlineStatus';
import { usePageState } from './usePageState';
import { useServices } from './useServices';
import { useStore } from './useStore';

export const COMPLETED_ONBOARD_POLL_SECONDS = 60;

/**
 * Marks an agent's setup complete once the middleware reports a completed
 * onboard funding run for it, so setup completes even when the run finished
 * with its funding screen closed, and for agents left "Unfinished setup"
 * before this check existed. Asks about unfinished agents only, and stops
 * asking once none is left.
 */
export const useCompleteSetupFromFundingRuns = () => {
  const { isUserLoggedIn } = usePageState();
  const { isOnline } = useOnlineStatusContext();
  const { services } = useServices();
  const { storeState } = useStore();
  const { isInstanceInitiallyFunded, setInstanceInitiallyFunded } =
    useIsInitiallyFunded();
  const { logMessage } = useLogAutoRunEvent();

  const unfinished = useMemo(() => {
    const byId = new Map<string, AgentType>();
    for (const service of services ?? []) {
      const agentEntry = getAgentFromService(service);
      if (!agentEntry) continue;
      const [agentType] = agentEntry;
      // A legacy boolean is left for its migration to convert.
      if (typeof storeState?.[agentType]?.isInitialFunded === 'boolean') {
        continue;
      }
      if (isInstanceInitiallyFunded(service.service_config_id, agentType)) {
        continue;
      }
      byId.set(service.service_config_id, agentType);
    }
    return byId;
  }, [isInstanceInitiallyFunded, services, storeState]);

  const unfinishedIds = useMemo(() => [...unfinished.keys()], [unfinished]);

  const { data, error, isSuccess } = useQuery({
    queryKey: REACT_QUERY_KEYS.FUNDING_RUN_COMPLETED_ONBOARD_KEY(unfinishedIds),
    queryFn: () => FundingRunService.getCompletedOnboardRuns(unfinishedIds),
    enabled: isUserLoggedIn && isOnline && unfinishedIds.length > 0,
    refetchInterval: COMPLETED_ONBOARD_POLL_SECONDS * 1000,
    // A run can finish while Pearl is hidden.
    refetchIntervalInBackground: true,
  });

  // One line per run of failures, so a missing route does not flood the log.
  const isFailureLoggedRef = useRef(false);
  useEffect(() => {
    if (isSuccess) {
      isFailureLoggedRef.current = false;
      return;
    }
    if (!error || isFailureLoggedRef.current) return;
    isFailureLoggedRef.current = true;
    logMessage(`completed onboard funding runs fetch error: ${error}`);
  }, [error, isSuccess, logMessage]);

  useEffect(() => {
    for (const run of data?.runs ?? []) {
      const agentType = unfinished.get(run.service_config_id);
      if (!agentType) continue;
      setInstanceInitiallyFunded(run.service_config_id, agentType);
      logMessage(
        `setup complete from funding run ${run.run_id}: ${run.service_config_id}`,
      );
    }
  }, [data, logMessage, setInstanceInitiallyFunded, unfinished]);
};
