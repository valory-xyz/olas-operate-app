import { act, renderHook, waitFor } from '@testing-library/react';

import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { useConnectSession } from '../../hooks/useConnectSession';

// ConnectService.startSession is the network call — mock it entirely.
const mockStartSession = jest.fn();
jest.mock('../../service/agents/Connect', () => ({
  ConnectService: {
    startSession: (...args: unknown[]) => mockStartSession(...args),
  },
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

describe('useConnectSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartSession.mockResolvedValue({
      reachable: true,
      launched: true,
      harness: 'claude_code_desktop',
    });
    servicesValue = runningConnect();
  });

  it('auto-launches the session once when a running Connect server is ready', async () => {
    const { result } = renderHook(() => useConnectSession());
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
    expect(result.current.showAlert).toBe(false);
    expect(result.current.errorKind).toBeNull();
  });

  it('does not launch for a non-Connect agent', () => {
    servicesValue = runningConnect({ selectedAgentType: 'trader' });
    renderHook(() => useConnectSession());
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('does not launch until the local server (healthcheck) is ready', () => {
    servicesValue = runningConnect({ deploymentDetails: { healthcheck: {} } });
    renderHook(() => useConnectSession());
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('does not launch when the service is not running', () => {
    servicesValue = runningConnect({
      selectedService: { service_config_id: 'sc-1', deploymentStatus: STOPPED },
    });
    renderHook(() => useConnectSession());
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('surfaces the "not installed" state when no harness was launched', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      launched: false,
      harness: null,
    });
    const { result } = renderHook(() => useConnectSession());
    await waitFor(() => expect(result.current.showAlert).toBe(true));
    expect(result.current.errorKind).toBe('not-installed');
  });

  it('surfaces the "launch failed" state when a harness exists but did not launch', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      launched: false,
      harness: 'claude_code_desktop',
    });
    const { result } = renderHook(() => useConnectSession());
    await waitFor(() => expect(result.current.errorKind).toBe('launch-failed'));
  });

  it('treats an unreachable server as a retryable launch failure', async () => {
    mockStartSession.mockResolvedValue({ reachable: false });
    const { result } = renderHook(() => useConnectSession());
    await waitFor(() => expect(result.current.errorKind).toBe('launch-failed'));
  });

  it('re-launches on retry and clears the alert on success', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      launched: false,
      harness: 'claude_code_desktop',
    });
    const { result } = renderHook(() => useConnectSession());
    await waitFor(() => expect(result.current.errorKind).toBe('launch-failed'));

    mockStartSession.mockResolvedValue({ reachable: true, launched: true });
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.showAlert).toBe(false));
    expect(mockStartSession).toHaveBeenCalledTimes(2);
  });

  it('dismiss hides the alert without re-launching', async () => {
    mockStartSession.mockResolvedValue({
      reachable: true,
      launched: false,
      harness: 'claude_code_desktop',
    });
    const { result } = renderHook(() => useConnectSession());
    await waitFor(() => expect(result.current.showAlert).toBe(true));

    act(() => result.current.dismiss());
    expect(result.current.showAlert).toBe(false);
    expect(mockStartSession).toHaveBeenCalledTimes(1);
  });

  it('re-launches for a fresh run after the agent was stopped', async () => {
    const { rerender } = renderHook(() => useConnectSession());
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));

    // Agent stops → state resets.
    servicesValue = runningConnect({
      selectedService: { service_config_id: 'sc-1', deploymentStatus: STOPPED },
    });
    rerender();

    // Agent starts again → launches a second time.
    servicesValue = runningConnect();
    rerender();
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(2));
  });
});
