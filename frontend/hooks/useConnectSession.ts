import { useCallback, useEffect, useRef, useState } from 'react';

import { AgentMap } from '@/constants';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { ConnectService } from '@/service/agents/Connect';
import { ConnectSessionResult } from '@/types';

import { useServices } from './useServices';

/**
 * Which error state to surface for the Connect session:
 * - `not-installed`: no Claude harness is installed → prompt to download.
 * - `launch-failed`: a harness exists but launch failed (or the server was
 *   unreachable) → retryable.
 */
export type ConnectSessionErrorKind = 'not-installed' | 'launch-failed';

const toErrorKind = (
  res: ConnectSessionResult,
): ConnectSessionErrorKind | null => {
  // Couldn't reach the local server at all — retryable.
  if (!res.reachable) return 'launch-failed';
  // A session was launched — nothing to surface.
  if (res.launched) return null;
  // Server responded without launching: no harness installed vs. failed launch.
  return res.harness ? 'launch-failed' : 'not-installed';
};

/**
 * Drives the Connect agent's local Claude Code session.
 *
 * Once the selected Connect service is DEPLOYED and its local server is up
 * (healthcheck populated), this auto-calls `POST /session` exactly once per run
 * to launch the session, and exposes the failure (if any) plus `retry` /
 * `dismiss` so the UI can surface the two error states.
 *
 * State is reset whenever the agent stops or a non-Connect agent is selected,
 * so a fresh run re-launches and can re-surface an error the user dismissed.
 */
export const useConnectSession = () => {
  const { selectedAgentType, selectedService, deploymentDetails } =
    useServices();

  const isConnect = selectedAgentType === AgentMap.Connect;
  const isRunning =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYED;
  // The local agent server (which hosts /session) is only reachable once the
  // deployment reports a healthcheck — same signal the agent-UI iframe waits on.
  const isServerReady =
    Object.keys(deploymentDetails?.healthcheck || {}).length > 0;
  const serviceConfigId = selectedService?.service_config_id;

  const [errorKind, setErrorKind] = useState<ConnectSessionErrorKind | null>(
    null,
  );
  const [isLaunching, setIsLaunching] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Which service we've already auto-launched for (guards the one-shot effect).
  const launchedForRef = useRef<string | null>(null);

  const runSession = useCallback(async () => {
    if (!serviceConfigId) return;
    setDismissed(false);
    setIsLaunching(true);
    const res = await ConnectService.startSession();
    setIsLaunching(false);
    // Keep the previous error visible until the new result lands (so a Retry
    // keeps the alert on screen with a loading button).
    setErrorKind(toErrorKind(res));
  }, [serviceConfigId]);

  // Reset when the selected agent is no longer a running Connect instance.
  useEffect(() => {
    if (isConnect && isRunning) return;
    launchedForRef.current = null;
    setErrorKind(null);
    setIsLaunching(false);
    setDismissed(false);
  }, [isConnect, isRunning]);

  // Auto-launch once per run, when the local server is ready.
  useEffect(() => {
    if (!isConnect || !isRunning || !isServerReady || !serviceConfigId) return;
    if (launchedForRef.current === serviceConfigId) return;
    launchedForRef.current = serviceConfigId;
    runSession();
  }, [isConnect, isRunning, isServerReady, serviceConfigId, runSession]);

  const retry = useCallback(() => {
    runSession();
  }, [runSession]);

  const dismiss = useCallback(() => setDismissed(true), []);

  const showAlert = isConnect && !dismissed && errorKind !== null;

  return { isConnect, errorKind, isLaunching, showAlert, retry, dismiss };
};
