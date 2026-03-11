import { renderHook } from '@testing-library/react';

import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import { ServiceDeployment } from '../../types/Agent';
import { makeService } from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const mockDeploymentDetails: ServiceDeployment = {
  status: MiddlewareDeploymentStatusMap.DEPLOYED,
  nodes: { agent: [], tendermint: [] },
  healthcheck: {
    agent_health: {},
    is_healthy: true,
    is_tm_healthy: true,
    is_transitioning_fast: false,
    period: 0,
    reset_pause_duration: 0,
    rounds: [],
    seconds_since_last_transition: 0,
  },
};

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

  it('returns both flags false when deployment status is STOPPING', () => {
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
