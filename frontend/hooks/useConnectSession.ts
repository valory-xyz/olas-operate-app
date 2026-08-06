import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AgentMap } from '@/constants';
import {
  isActiveDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '@/constants/deployment';
import { ConnectSessionResult } from '@/types';

import { useAgentRunning } from './useAgentRunning';
import { useElectronApi } from './useElectronApi';
import { useServices } from './useServices';
import { useStore } from './useStore';

/**
 * Which error state to surface for the Connect session:
 * - `not-installed`: the deep link wouldn't open → no Claude installed (or the
 *   wrong harness is selected) → prompt to download / surface the server message.
 * - `launch-failed`: transport error, or a non-2xx (unknown harness / not-ready
 *   / malformed) response → transient, retryable.
 */
export type ConnectSessionErrorKind = 'not-installed' | 'launch-failed';

const CONNECT_SESSION_QUERY_KEY = 'connectSession';

/**
 * Set when the first-run modal's CTA completes the first run, and held for the
 * remainder of that run.
 *
 * Completing the first run writes `firstRunCompleted`, which on its own would
 * immediately satisfy the auto-launch gate and fire the very session the first
 * run exists to defer. This keeps the run suppressed regardless, so an
 * instance's first run launches nothing at all; the agent-stopped cleanup
 * clears it, and the next run auto-launches normally.
 *
 * Lives in the query cache rather than component state because
 * `useConnectSession` has several independent call sites that must agree on it.
 */
const CONNECT_LAUNCH_SUPPRESSED_QUERY_KEY = 'connectLaunchSuppressed';

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
 * An instance's *first* run launches nothing at all: the first-run modal takes
 * over, and the auto-launch stays suppressed for that entire run (see
 * `CONNECT_LAUNCH_SUPPRESSED_QUERY_KEY`). Auto-launch resumes on the next run.
 *
 * Exposes the failure (if any) plus `retry` / `dismiss` for the alert UI.
 */
export const useConnectSession = () => {
  const { selectedAgentType, selectedService, deploymentDetails } =
    useServices();
  const { isAnotherAgentRunning } = useAgentRunning();
  const { connect, store } = useElectronApi();
  const { storeState } = useStore();
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

  // First-run gate: suppress auto-launch until the user has completed the
  // first-run modal flow. `undefined` entries are treated as first-run.
  const isFirstRunComplete =
    storeState !== undefined &&
    (storeState.connect?.firstRunCompleted?.[serviceConfigId ?? ''] ??
      false) === true;

  const [dismissed, setDismissed] = useState(false);

  // Everything the run needs before a session may be auto-launched.
  const isReady = Boolean(
    isConnect && isRunning && isServerReady && serviceConfigId,
  );
  const isStoreHydrated = storeState !== undefined;

  const { data: isLaunchSuppressed } = useQuery<boolean>({
    queryKey: [CONNECT_LAUNCH_SUPPRESSED_QUERY_KEY, serviceConfigId],
    // Never fetched — written directly by `markFirstRunComplete`.
    queryFn: () => false,
    enabled: false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const enabled = isReady && isFirstRunComplete && !isLaunchSuppressed;

  const { data, isFetching, refetch } = useQuery({
    queryKey: [CONNECT_SESSION_QUERY_KEY, serviceConfigId],
    // Launched from the Electron main process: the agent's local server enables
    // no CORS, so a renderer fetch to it is blocked before it is sent. Outside
    // Electron the bridge is absent and the launch is simply unreachable.
    queryFn: (): Promise<ConnectSessionResult> =>
      connect?.startSession?.() ?? Promise.resolve({ reachable: false }),
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
    // Lift the first-run suppression too — that is what turns a completed first
    // run into an auto-launching subsequent one.
    queryClient.removeQueries({
      queryKey: [CONNECT_LAUNCH_SUPPRESSED_QUERY_KEY, serviceConfigId],
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
  // Suppressed while another agent is running, so the "another agent is
  // running" alert is the only one shown (one alert at a time, by priority).
  const showStartInfo =
    isConnect &&
    !isActiveDeploymentStatus(selectedService?.deploymentStatus) &&
    !isAnotherAgentRunning;
  const showRunningInfo = isConnect && isRunning;

  // First-run state, scoped to the run rather than read live off the store flag:
  // it stays true after the CTA writes `firstRunCompleted`, so the status strip
  // keeps the first-run copy for the rest of the run instead of flipping mid-run.
  const isFirstRun = Boolean(
    isConnect &&
      isRunning &&
      isStoreHydrated &&
      (!isFirstRunComplete || isLaunchSuppressed),
  );
  // The modal itself is dismissed by the CTA, so it does track the store flag.
  // `serviceConfigId` is required: without one `markFirstRunComplete` cannot
  // persist anything, and a non-dismissable modal that the CTA cannot dismiss
  // would trap the user.
  const showFirstRunModal =
    isFirstRun &&
    isServerReady &&
    Boolean(serviceConfigId) &&
    !isFirstRunComplete;

  const markFirstRunComplete = useCallback(() => {
    if (!serviceConfigId) return;
    // Suppress before persisting: the store write lands back in `storeState`,
    // which would otherwise open the auto-launch gate for the rest of this run.
    queryClient.setQueryData<boolean>(
      [CONNECT_LAUNCH_SUPPRESSED_QUERY_KEY, serviceConfigId],
      true,
    );
    const existing = storeState?.connect?.firstRunCompleted ?? {};
    store?.set?.('connect.firstRunCompleted', {
      ...existing,
      [serviceConfigId]: true,
    });
  }, [
    store,
    queryClient,
    serviceConfigId,
    storeState?.connect?.firstRunCompleted,
  ]);

  return {
    isConnect,
    showStartInfo,
    showRunningInfo,
    isFirstRun,
    showFirstRunModal,
    markFirstRunComplete,
    errorKind: error?.kind ?? null,
    errorMessage: error?.message,
    isLaunching: isFetching,
    showAlert,
    retry,
    dismiss,
  };
};
