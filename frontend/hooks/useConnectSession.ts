import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AgentMap } from '@/constants';
import {
  isActiveDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '@/constants/deployment';
import { ConnectService } from '@/service/agents/Connect';
import { ConnectSessionResult } from '@/types';

import { useServices } from './useServices';

/**
 * Which error state to surface for the Connect session:
 * - `not-installed`: the deep link wouldn't open → no Claude installed (or the
 *   wrong harness is selected) → prompt to download / surface the server message.
 * - `launch-failed`: transport error, or a non-2xx (unknown harness / not-ready
 *   / malformed) response → transient, retryable.
 */
export type ConnectSessionErrorKind = 'not-installed' | 'launch-failed';

const CONNECT_SESSION_QUERY_KEY = 'connectSession';

const toErrorKind = (
  res: ConnectSessionResult,
): ConnectSessionErrorKind | null => {
  // Couldn't reach the server, or a non-2xx (unknown harness / not-ready /
  // malformed body) — ambiguous, so keep it retryable rather than telling the
  // user to install Claude they may already have.
  if (!res.reachable || !res.ok) return 'launch-failed';
  // A session launched — nothing to surface.
  if (res.launched) return null;
  // Well-formed `200 { launched: false }`: the only cause is the deep link not
  // opening, i.e. Claude isn't installed (or the wrong harness is selected).
  return 'not-installed';
};

/**
 * Drives the Connect agent's local Claude Code session.
 *
 * The launch is modelled as a React Query keyed by `service_config_id`, so it
 * runs `POST /session` exactly once when the agent is DEPLOYED and its local
 * server is up (healthcheck populated). Because the result is cached in the
 * always-mounted `QueryClient` with `staleTime`/`gcTime: Infinity`, navigating
 * away from and back to the page re-reads the cache instead of re-launching —
 * the session is never relaunched for the same run. When the agent stops, the
 * cached entry is cleared so the next run launches again.
 *
 * Exposes the failure (if any) plus `retry` / `dismiss` for the alert UI.
 */
export const useConnectSession = () => {
  const { selectedAgentType, selectedService, deploymentDetails } =
    useServices();
  const queryClient = useQueryClient();

  const isConnect = selectedAgentType === AgentMap.Connect;
  const isRunning =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYED;
  // The local agent server (which hosts /session) is only reachable once the
  // deployment reports a healthcheck — same signal the agent-UI iframe waits on.
  const isServerReady =
    Object.keys(deploymentDetails?.healthcheck || {}).length > 0;
  const serviceConfigId = selectedService?.service_config_id;

  const [dismissed, setDismissed] = useState(false);

  const enabled = Boolean(
    isConnect && isRunning && isServerReady && serviceConfigId,
  );

  const { data, isFetching, refetch } = useQuery({
    queryKey: [CONNECT_SESSION_QUERY_KEY, serviceConfigId],
    queryFn: () => ConnectService.startSession(),
    enabled,
    // Launch once per run and keep the result cached across navigation so the
    // session is not relaunched when the alert unmounts/remounts.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  // When the agent isn't a running Connect instance, drop the cached launch (so
  // the next run launches again) and clear any dismissal.
  useEffect(() => {
    if (isConnect && isRunning) return;
    setDismissed(false);
    if (!serviceConfigId) return;
    queryClient.removeQueries({
      queryKey: [CONNECT_SESSION_QUERY_KEY, serviceConfigId],
    });
  }, [isConnect, isRunning, serviceConfigId, queryClient]);

  const error = useMemo(() => {
    if (!data) return null;
    const kind = toErrorKind(data);
    if (!kind) return null;
    return { kind, message: data.reachable ? data.error : undefined };
  }, [data]);

  const retry = useCallback(() => {
    setDismissed(false);
    refetch();
  }, [refetch]);

  const dismiss = useCallback(() => setDismissed(true), []);

  // Gate on `isRunning` too, so a result that resolves right after the agent
  // stops can't surface a stale alert on a stopped agent.
  const showAlert = Boolean(isConnect && isRunning && !dismissed && error);

  // Idle Connect agent (no active/transitioning deployment) — the UI nudges
  // the user to start it so the Claude Code session can launch. Once the agent
  // is DEPLOYED the nudge flips to pointing at the agent profile for new
  // sessions; during transitions (deploying/stopping) neither applies.
  const showStartInfo =
    isConnect && !isActiveDeploymentStatus(selectedService?.deploymentStatus);
  const showRunningInfo = isConnect && isRunning;

  return {
    isConnect,
    showStartInfo,
    showRunningInfo,
    errorKind: error?.kind ?? null,
    errorMessage: error?.message,
    isLaunching: isFetching,
    showAlert,
    retry,
    dismiss,
  };
};
