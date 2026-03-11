import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { AGENT_CONFIG } from '../../config/agents';
import { AgentMap } from '../../constants/agent';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { useAgentRunning } from '../../hooks/useAgentRunning';
import { useOnlineStatusContext } from '../../hooks/useOnlineStatus';
import { useServices } from '../../hooks/useServices';
import { ServicesService } from '../../service/Services';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

jest.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatusContext: jest.fn(),
}));

jest.mock('../../hooks/useDynamicRefetchInterval', () => ({
  useDynamicRefetchInterval: jest.fn((interval: number) => interval),
}));

jest.mock('../../service/Services', () => ({
  ServicesService: { getAllServiceDeployments: jest.fn() },
}));

const mockUseServices = useServices as jest.Mock;
const mockUseOnlineStatusContext = useOnlineStatusContext as jest.Mock;
const mockGetAllServiceDeployments =
  ServicesService.getAllServiceDeployments as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];

const makeServiceEntry = (
  configId: string,
  publicId = traderConfig.servicePublicId,
  homeChain = traderConfig.middlewareHomeChainId,
) => ({
  service_config_id: configId,
  service_public_id: publicId,
  home_chain: homeChain,
});

describe('useAgentRunning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnlineStatusContext.mockReturnValue({ isOnline: true });
  });

  it('returns false for all values when services is undefined', () => {
    mockUseServices.mockReturnValue({
      services: undefined,
      selectedService: undefined,
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isAnotherAgentRunning).toBe(false);
    expect(result.current.runningAgentType).toBeNull();
    expect(result.current.runningServiceConfigId).toBeNull();
  });

  it('returns isAnotherAgentRunning=false when no other service is active', async () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    mockUseServices.mockReturnValue({
      services: [selectedService],
      selectedService,
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });
    mockGetAllServiceDeployments.mockResolvedValue({
      [DEFAULT_SERVICE_CONFIG_ID]: {
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
      },
    });

    const { result } = renderHook(() => useAgentRunning(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isAnotherAgentRunning).toBe(false);
    });
  });

  it('returns isAnotherAgentRunning=true when another service is deployed', async () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const otherService = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, otherService],
      selectedService,
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });
    mockGetAllServiceDeployments.mockResolvedValue({
      [DEFAULT_SERVICE_CONFIG_ID]: {
        status: MiddlewareDeploymentStatusMap.STOPPED,
      },
      [MOCK_SERVICE_CONFIG_ID_2]: {
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
      },
    });

    const { result } = renderHook(() => useAgentRunning(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isAnotherAgentRunning).toBe(true);
    });
  });

  it('considers status overrides when determining isAnotherAgentRunning', async () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const otherService = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, otherService],
      selectedService,
      serviceStatusOverrides: {
        [MOCK_SERVICE_CONFIG_ID_2]: MiddlewareDeploymentStatusMap.DEPLOYING,
      },
      getServiceConfigIdFromAgentType: jest.fn(),
    });
    mockGetAllServiceDeployments.mockResolvedValue({
      [DEFAULT_SERVICE_CONFIG_ID]: {
        status: MiddlewareDeploymentStatusMap.STOPPED,
      },
      [MOCK_SERVICE_CONFIG_ID_2]: {
        status: MiddlewareDeploymentStatusMap.STOPPED,
      },
    });

    const { result } = renderHook(() => useAgentRunning(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isAnotherAgentRunning).toBe(true);
    });
  });

  it('returns isAnotherAgentRunning=false when all other services are stopped', async () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const otherService = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, otherService],
      selectedService,
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });
    mockGetAllServiceDeployments.mockResolvedValue({
      [DEFAULT_SERVICE_CONFIG_ID]: {
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
      },
      [MOCK_SERVICE_CONFIG_ID_2]: {
        status: MiddlewareDeploymentStatusMap.STOPPED,
      },
    });

    const { result } = renderHook(() => useAgentRunning(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(result.current.isAnotherAgentRunning).toBe(false);
    });
  });

  it('returns runningServiceConfigId for the running agent', async () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const mockGetConfigId = jest.fn().mockReturnValue(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2)],
      selectedService,
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: mockGetConfigId,
    });
    mockGetAllServiceDeployments.mockResolvedValue({
      [DEFAULT_SERVICE_CONFIG_ID]: {
        status: MiddlewareDeploymentStatusMap.STOPPED,
      },
      [MOCK_SERVICE_CONFIG_ID_2]: {
        status: MiddlewareDeploymentStatusMap.DEPLOYED,
      },
    });

    const { result } = renderHook(() => useAgentRunning(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.runningServiceConfigId).toBe(
        MOCK_SERVICE_CONFIG_ID_2,
      );
    });
  });

  it('returns runningAgentType=null when no deployments are active', async () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    mockUseServices.mockReturnValue({
      services: [selectedService],
      selectedService,
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });
    mockGetAllServiceDeployments.mockResolvedValue({
      [DEFAULT_SERVICE_CONFIG_ID]: {
        status: MiddlewareDeploymentStatusMap.STOPPED,
      },
    });

    const { result } = renderHook(() => useAgentRunning(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.runningAgentType).toBeNull();
    });
  });

  it('does not fetch deployments when offline', () => {
    mockUseOnlineStatusContext.mockReturnValue({ isOnline: false });
    mockUseServices.mockReturnValue({
      services: [makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID)],
      selectedService: makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID),
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    renderHook(() => useAgentRunning(), { wrapper: createWrapper() });

    expect(mockGetAllServiceDeployments).not.toHaveBeenCalled();
  });

  it('does not fetch deployments when services is empty', () => {
    mockUseServices.mockReturnValue({
      services: [],
      selectedService: undefined,
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    renderHook(() => useAgentRunning(), { wrapper: createWrapper() });

    expect(mockGetAllServiceDeployments).not.toHaveBeenCalled();
  });
});
