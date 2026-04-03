import { renderHook } from '@testing-library/react';

import { AGENT_CONFIG } from '../../config/agents';
import { AgentMap } from '../../constants/agent';
import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { useAgentRunning } from '../../hooks/useAgentRunning';
import { useServices } from '../../hooks/useServices';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
} from '../helpers/factories';

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

const mockUseServices = useServices as jest.Mock;

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
  });

  it('returns false for all values when services is undefined', () => {
    mockUseServices.mockReturnValue({
      services: undefined,
      selectedService: undefined,
      allDeployments: undefined,
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.isAnotherAgentRunning).toBe(false);
    expect(result.current.runningAgentType).toBeNull();
    expect(result.current.runningServiceConfigId).toBeNull();
  });

  it('returns isAnotherAgentRunning=false when no other service is active', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    mockUseServices.mockReturnValue({
      services: [selectedService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
      },
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.isAnotherAgentRunning).toBe(false);
  });

  it('returns isAnotherAgentRunning=true when another service is deployed', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const otherService = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, otherService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
        [MOCK_SERVICE_CONFIG_ID_2]: {
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
      },
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.isAnotherAgentRunning).toBe(true);
  });

  it('considers status overrides when determining isAnotherAgentRunning', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const otherService = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, otherService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
        [MOCK_SERVICE_CONFIG_ID_2]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
      },
      serviceStatusOverrides: {
        [MOCK_SERVICE_CONFIG_ID_2]: MiddlewareDeploymentStatusMap.DEPLOYING,
      },
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.isAnotherAgentRunning).toBe(true);
  });

  it('override of STOPPED suppresses isAnotherAgentRunning when backend says another service is DEPLOYED', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const otherService = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, otherService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
        [MOCK_SERVICE_CONFIG_ID_2]: {
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
      },
      serviceStatusOverrides: {
        [MOCK_SERVICE_CONFIG_ID_2]: MiddlewareDeploymentStatusMap.STOPPED,
      },
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.isAnotherAgentRunning).toBe(false);
  });

  it('returns isAnotherAgentRunning=false when all other services are stopped', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const otherService = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, otherService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
        [MOCK_SERVICE_CONFIG_ID_2]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
      },
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.isAnotherAgentRunning).toBe(false);
  });

  it('returns runningServiceConfigId for the running agent', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const mockGetConfigId = jest.fn().mockReturnValue(MOCK_SERVICE_CONFIG_ID_2);
    mockUseServices.mockReturnValue({
      services: [selectedService, makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2)],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
        [MOCK_SERVICE_CONFIG_ID_2]: {
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
      },
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: mockGetConfigId,
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.runningServiceConfigId).toBe(
      MOCK_SERVICE_CONFIG_ID_2,
    );
  });

  it('returns runningAgentType=null when no deployments are active', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    mockUseServices.mockReturnValue({
      services: [selectedService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
      },
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.runningAgentType).toBeNull();
  });

  it('considers status overrides when determining runningAgentType', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    mockUseServices.mockReturnValue({
      services: [selectedService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
      },
      serviceStatusOverrides: {
        [DEFAULT_SERVICE_CONFIG_ID]: MiddlewareDeploymentStatusMap.DEPLOYING,
      },
      getServiceConfigIdFromAgentType: jest
        .fn()
        .mockReturnValue(DEFAULT_SERVICE_CONFIG_ID),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.runningAgentType).toBe(AgentMap.PredictTrader);
  });

  it('override of STOPPED suppresses runningAgentType even when backend says DEPLOYED', () => {
    const selectedService = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    mockUseServices.mockReturnValue({
      services: [selectedService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
      },
      serviceStatusOverrides: {
        [DEFAULT_SERVICE_CONFIG_ID]: MiddlewareDeploymentStatusMap.STOPPED,
      },
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.runningAgentType).toBeNull();
  });

  it('returns the second instance config ID when two instances of the same agent type exist and the second is running', () => {
    const firstInstance = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const secondInstance = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);
    const selectedService = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_3);

    mockUseServices.mockReturnValue({
      services: [firstInstance, secondInstance, selectedService],
      selectedService,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
        [MOCK_SERVICE_CONFIG_ID_2]: {
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
        [MOCK_SERVICE_CONFIG_ID_3]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
      },
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.runningServiceConfigId).toBe(
      MOCK_SERVICE_CONFIG_ID_2,
    );
    expect(result.current.runningAgentType).toBe(AgentMap.PredictTrader);
  });

  it('returns the first instance config ID when the first of two same-type instances is running', () => {
    const firstInstance = makeServiceEntry(DEFAULT_SERVICE_CONFIG_ID);
    const secondInstance = makeServiceEntry(MOCK_SERVICE_CONFIG_ID_2);

    mockUseServices.mockReturnValue({
      services: [firstInstance, secondInstance],
      selectedService: firstInstance,
      allDeployments: {
        [DEFAULT_SERVICE_CONFIG_ID]: {
          status: MiddlewareDeploymentStatusMap.DEPLOYED,
        },
        [MOCK_SERVICE_CONFIG_ID_2]: {
          status: MiddlewareDeploymentStatusMap.STOPPED,
        },
      },
      serviceStatusOverrides: {},
      getServiceConfigIdFromAgentType: jest.fn(),
    });

    const { result } = renderHook(() => useAgentRunning());

    expect(result.current.runningServiceConfigId).toBe(
      DEFAULT_SERVICE_CONFIG_ID,
    );
    expect(result.current.runningAgentType).toBe(AgentMap.PredictTrader);
  });
});
