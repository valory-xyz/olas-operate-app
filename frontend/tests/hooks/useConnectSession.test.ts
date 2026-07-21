import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { useConnectSession } from '../../hooks/useConnectSession';

// The launch goes through the Electron main process (the agent server enables
// no CORS) — mock the IPC bridge.
const mockStartSession = jest.fn();
let connectApi: Record<string, unknown> | undefined;
jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({ connect: connectApi }),
}));

// Controllable useServices return value.
let servicesValue: Record<string, unknown>;
jest.mock('../../hooks/useServices', () => ({
  useServices: () => servicesValue,
}));

const DEPLOYED = MiddlewareDeploymentStatusMap.DEPLOYED;
const STOPPED = MiddlewareDeploymentStatusMap.STOPPED;

const runningConnect = (over: Record<string, unknown> = {}) => ({
  selectedAgentType: 'connect',
  selectedService: { service_config_id: 'sc-1', deploymentStatus: DEPLOYED },
  deploymentDetails: { healthcheck: { round: 'x' } },
  ...over,
});

// Each render gets its own QueryClient so the launch cache doesn't leak between
// tests; a single test keeps the same client across `rerender`.
const renderConnectSession = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useConnectSession(), { wrapper });
};

describe('useConnectSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartSession.mockResolvedValue({
      reachable: true,
      ok: true,
      launched: true,
    });
    connectApi = {
      startSession: (...args: unknown[]) => mockStartSession(...args),
    };
    servicesValue = runningConnect();
  });

  it('auto-launches the session once when a running Connect server is ready', async () => {
    const { result } = renderConnectSession();
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.showAlert).toBe(false));
    expect(result.current.errorKind).toBeNull();
  });

  it('does not launch for a non-Connect agent', () => {
    servicesValue = runningConnect({ selectedAgentType: 'trader' });
    renderConnectSession();
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('does not launch until the local server (healthcheck) is ready', () => {
    servicesValue = runningConnect({ deploymentDetails: { healthcheck: {} } });
    renderConnectSession();
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('does not launch when the service is not running', () => {
    servicesValue = runningConnect({
      selectedService: { service_config_id: 'sc-1', deploymentStatus: STOPPED },
    });
    renderConnectSession();
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('surfaces the "not installed" state for a 200 that did not launch, with the server message', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      ok: true,
      launched: false,
      error: 'No Claude found; install it or change the harness.',
    });
    const { result } = renderConnectSession();
    await waitFor(() => expect(result.current.showAlert).toBe(true));
    expect(result.current.errorKind).toBe('not-installed');
    expect(result.current.errorMessage).toBe(
      'No Claude found; install it or change the harness.',
    );
  });

  it('surfaces the "launch failed" state for a non-2xx response', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      ok: false,
      launched: false,
      error: 'workspace not ready',
    });
    const { result } = renderConnectSession();
    await waitFor(() => expect(result.current.errorKind).toBe('launch-failed'));
  });

  it('treats a missing Electron bridge as a retryable launch failure', async () => {
    connectApi = undefined;
    const { result } = renderConnectSession();
    await waitFor(() => expect(result.current.errorKind).toBe('launch-failed'));
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('treats an unreachable server as a retryable launch failure', async () => {
    mockStartSession.mockResolvedValue({ reachable: false });
    const { result } = renderConnectSession();
    await waitFor(() => expect(result.current.errorKind).toBe('launch-failed'));
  });

  it('re-launches on retry and clears the alert on success', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      ok: false,
      launched: false,
    });
    const { result } = renderConnectSession();
    await waitFor(() => expect(result.current.errorKind).toBe('launch-failed'));

    mockStartSession.mockResolvedValue({
      reachable: true,
      ok: true,
      launched: true,
    });
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.showAlert).toBe(false));
    expect(mockStartSession).toHaveBeenCalledTimes(2);
  });

  it('dismiss hides the alert without re-launching', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      ok: false,
      launched: false,
    });
    const { result } = renderConnectSession();
    await waitFor(() => expect(result.current.showAlert).toBe(true));

    act(() => result.current.dismiss());
    expect(result.current.showAlert).toBe(false);
    expect(mockStartSession).toHaveBeenCalledTimes(1);
  });

  it('re-launches for a fresh run after the agent was stopped', async () => {
    const { rerender } = renderConnectSession();
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));

    // Agent stops → cached launch is cleared.
    servicesValue = runningConnect({
      selectedService: { service_config_id: 'sc-1', deploymentStatus: STOPPED },
    });
    rerender();

    // Agent starts again → launches a second time.
    servicesValue = runningConnect();
    rerender();
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(2));
  });

  it('flips from the start-agent info to the running info once the agent starts', async () => {
    servicesValue = runningConnect({
      selectedService: { service_config_id: 'sc-1', deploymentStatus: STOPPED },
    });
    const { result, rerender } = renderConnectSession();
    expect(result.current.showStartInfo).toBe(true);
    expect(result.current.showRunningInfo).toBe(false);

    // Agent starts → the idle nudge flips to the running one.
    servicesValue = runningConnect();
    rerender();
    expect(result.current.showStartInfo).toBe(false);
    expect(result.current.showRunningInfo).toBe(true);
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
  });

  it('shows neither info while the deployment is transitioning', () => {
    servicesValue = runningConnect({
      selectedService: {
        service_config_id: 'sc-1',
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYING,
      },
    });
    const { result } = renderConnectSession();
    expect(result.current.showStartInfo).toBe(false);
    expect(result.current.showRunningInfo).toBe(false);
  });

  it('does not show either info for a non-Connect agent', () => {
    servicesValue = runningConnect({
      selectedAgentType: 'trader',
      selectedService: { service_config_id: 'sc-1', deploymentStatus: STOPPED },
    });
    const { result } = renderConnectSession();
    expect(result.current.showStartInfo).toBe(false);
    expect(result.current.showRunningInfo).toBe(false);
  });

  it('does not surface an error alert once the agent has stopped', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      ok: false,
      launched: false,
    });
    const { result, rerender } = renderConnectSession();
    await waitFor(() => expect(result.current.showAlert).toBe(true));

    // Agent stops → the alert must not remain on a stopped agent.
    servicesValue = runningConnect({
      selectedService: { service_config_id: 'sc-1', deploymentStatus: STOPPED },
    });
    rerender();
    expect(result.current.showAlert).toBe(false);
  });
});
