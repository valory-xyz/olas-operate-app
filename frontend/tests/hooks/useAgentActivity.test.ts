import { renderHook } from '@testing-library/react';

import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import {
  makeAgentLiveness,
  makeService,
  makeServiceDeployment,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({ PROVIDERS: {} }));

const mockDeploymentDetails = makeServiceDeployment();

const mockUseServices = jest.fn();
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

describe('useAgentActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isServiceRunning=true when deployment status is DEPLOYED', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      }),
      deploymentDetails: mockDeploymentDetails,
    });

    const { result } = renderHook(() => useAgentActivity());
    expect(result.current.isServiceRunning).toBe(true);
    expect(result.current.isServiceDeploying).toBe(false);
    expect(result.current.deploymentDetails).toBe(mockDeploymentDetails);
  });

  it('returns isServiceDeploying=true when deployment status is DEPLOYING', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYING,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());
    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(true);
    expect(result.current.deploymentDetails).toBeUndefined();
  });

  it('returns isServiceRunning & isServiceDeploying flags false when deployment status is STOPPING', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPING,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());
    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when deployment status is STOPPED', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());
    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when deployment status is CREATED', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.CREATED,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when deployment status is BUILT', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.BUILT,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when deployment status is DELETED', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({
        deploymentStatus: MiddlewareDeploymentStatusMap.DELETED,
      }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  it('returns both flags false when selectedService is undefined', () => {
    mockUseServices.mockReturnValue({
      selectedService: undefined,
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });

  describe('agent liveness', () => {
    const renderWithLiveness = (
      liveness: Parameters<typeof makeAgentLiveness>[0] | null,
    ) => {
      mockUseServices.mockReturnValue({
        selectedService: makeService({
          deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
        }),
        deploymentDetails:
          liveness === null
            ? mockDeploymentDetails
            : makeServiceDeployment({
                agent_liveness: makeAgentLiveness(liveness),
              }),
      });
      return renderHook(() => useAgentActivity());
    };

    it('reports the agent inactive when the process has been gone for a while', () => {
      // The reported symptom: an evicted agent whose process died, while the
      // middleware still reports the deployment as DEPLOYED.
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'agent_process_exited',
        consecutive_failures: 60,
      });

      expect(result.current.isAgentActive).toBe(false);
      // `isServiceRunning` stays deployment-only so Staking.tsx can't end up
      // telling the user to start an agent whose button reads "Stop agent".
      expect(result.current.isServiceRunning).toBe(true);
    });

    it('reports the agent inactive when unresponsive for a while', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'agent_unresponsive',
        consecutive_failures: 60,
      });

      expect(result.current.isAgentActive).toBe(false);
    });

    // Regression, OPE-1920 follow-up: the agent answers HTTP 425 ("Too Early")
    // while starting up, which the middleware counts as an unhealthy probe and
    // which flips `is_alive` false on the very first one. Believing that
    // rendered "Agent is not running" under a "Pause" button.
    it('does not report a starting agent down after a couple of failed probes', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'agent_unresponsive',
        consecutive_failures: 2,
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    it('does not report down on a single failed probe', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'agent_process_exited',
        consecutive_failures: 1,
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    // Not probe-derived — the middleware stopped the service itself because it
    // could not clear an on-chain eviction, so there is nothing to wait out.
    it('reports down immediately for an uncleared eviction', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'evicted_cannot_restake',
        consecutive_failures: 0,
      });

      expect(result.current.isAgentActive).toBe(false);
    });

    // The middleware reports `not_monitored` when it holds no health-check
    // record and its PID-name probe misses — unknown, not dead.
    it('treats not_monitored as unknown, however many probes failed', () => {
      const { result } = renderWithLiveness({
        is_alive: false,
        reason: 'not_monitored',
        consecutive_failures: 60,
      });

      expect(result.current.isAgentActive).toBe(true);
    });

    it('returns isAgentActive=true when DEPLOYED and the agent is alive', () => {
      const { result } = renderWithLiveness({});

      expect(result.current.isAgentActive).toBe(true);
    });

    it('treats absent liveness as unknown, not as not-alive', () => {
      // Pearl ships against older middleware builds. Inverting this default
      // would read "Agent is not running" for every healthy agent.
      const { result } = renderWithLiveness(null);

      expect(result.current.isAgentActive).toBe(true);
    });
  });

  it('returns both flags false when deploymentStatus is undefined on the service', () => {
    mockUseServices.mockReturnValue({
      selectedService: makeService({ deploymentStatus: undefined }),
      deploymentDetails: undefined,
    });

    const { result } = renderHook(() => useAgentActivity());

    expect(result.current.isServiceRunning).toBe(false);
    expect(result.current.isServiceDeploying).toBe(false);
  });
});
