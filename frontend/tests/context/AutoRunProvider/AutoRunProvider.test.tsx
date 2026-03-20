import { renderHook } from '@testing-library/react';
import { act, PropsWithChildren } from 'react';

import { AGENT_CONFIG } from '../../../config/agents';
import { AgentMap } from '../../../constants/agent';
import {
  AutoRunProvider,
  useAutoRunContext,
} from '../../../context/AutoRunProvider/AutoRunProvider';
import { DISABLE_RACE_STOP_CHECK_INTERVAL_MS } from '../../../context/AutoRunProvider/constants';
import { IncludedAgentInstance } from '../../../context/AutoRunProvider/types';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../helpers/factories';

// --- Mutable mock state ---
const mockAutoRunStore = {
  enabled: false,
  includedInstances: [] as IncludedAgentInstance[],
  isInitialized: false,
  userExcludedInstances: [] as string[],
  updateAutoRun: jest.fn(),
};

const mockStopRunningAgent = jest.fn().mockResolvedValue(true);
const mockControllerRunningAgentType = { current: null as string | null };
const mockUpdateSelectedServiceConfigId = jest.fn();

/** Captured callbacks from the last useAutoRunController call. */
const capturedControllerCallbacks = {
  onAutoRunInstanceStarted: undefined as
    | ((serviceConfigId: string) => void)
    | undefined,
  onAutoRunStartStateChange: undefined as
    | ((isStarting: boolean) => void)
    | undefined,
};

// --- Mocks ---
jest.mock('../../../hooks', () => ({
  useServices: jest.fn().mockReturnValue({
    services: [
      { service_config_id: 'sc-aa001122-bb33-cc44-dd55-eeff66778899' },
      { service_config_id: 'sc-11223344-5566-7788-99aa-bbccddeeff00' },
    ],
    selectedAgentType: 'trader',
    selectedService: {
      service_config_id: 'sc-aa001122-bb33-cc44-dd55-eeff66778899',
    },
    selectedServiceConfigId: 'sc-aa001122-bb33-cc44-dd55-eeff66778899',
    updateSelectedServiceConfigId: jest.fn(),
  }),
  useElectronApi: jest.fn().mockReturnValue({
    showNotification: jest.fn(),
  }),
  useArchivedAgents: jest.fn().mockReturnValue({
    archivedInstances: [],
    isArchived: jest.fn().mockReturnValue(false),
    archiveInstance: jest.fn(),
    unarchiveInstance: jest.fn(),
  }),
}));

jest.mock('../../../context/AutoRunProvider/hooks/useAutoRunStore', () => ({
  useAutoRunStore: jest.fn(() => ({ ...mockAutoRunStore })),
}));

jest.mock('../../../context/AutoRunProvider/hooks/useConfiguredAgents', () => ({
  useConfiguredAgents: jest.fn(),
}));

jest.mock('../../../context/AutoRunProvider/hooks/useSafeEligibility', () => ({
  useSafeEligibility: jest.fn().mockReturnValue({
    canCreateSafeForChain: jest.fn().mockReturnValue('HasSafe'),
    createSafeIfNeeded: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock(
  '../../../context/AutoRunProvider/hooks/useSelectedEligibility',
  () => ({
    useSelectedEligibility: jest.fn().mockReturnValue({
      isSelectedAgentDetailsLoading: false,
      getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
    }),
  }),
);

jest.mock(
  '../../../context/AutoRunProvider/hooks/useAutoRunController',
  () => ({
    useAutoRunController: jest.fn(() => ({
      stopRunningAgent: mockStopRunningAgent,
      runningAgentType: mockControllerRunningAgentType.current,
    })),
  }),
);

// Access mock implementations for assertions
const { useAutoRunStore } = jest.requireMock(
  '../../../context/AutoRunProvider/hooks/useAutoRunStore',
) as { useAutoRunStore: jest.Mock };
const { useConfiguredAgents } = jest.requireMock(
  '../../../context/AutoRunProvider/hooks/useConfiguredAgents',
) as { useConfiguredAgents: jest.Mock };
const { useSelectedEligibility } = jest.requireMock(
  '../../../context/AutoRunProvider/hooks/useSelectedEligibility',
) as { useSelectedEligibility: jest.Mock };
const { useAutoRunController } = jest.requireMock(
  '../../../context/AutoRunProvider/hooks/useAutoRunController',
) as { useAutoRunController: jest.Mock };
const { useServices } = jest.requireMock('../../../hooks') as {
  useServices: jest.Mock;
};

const scTrader = DEFAULT_SERVICE_CONFIG_ID;
const scOptimus = MOCK_SERVICE_CONFIG_ID_2;

const wrapper = ({ children }: PropsWithChildren) => (
  <AutoRunProvider>{children}</AutoRunProvider>
);

describe('AutoRunProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAutoRunStore.enabled = false;
    mockAutoRunStore.includedInstances = [];
    mockAutoRunStore.isInitialized = false;
    mockAutoRunStore.userExcludedInstances = [];
    mockAutoRunStore.updateAutoRun = jest.fn();
    mockControllerRunningAgentType.current = null;
    mockUpdateSelectedServiceConfigId.mockClear();

    useServices.mockReturnValue({
      services: [
        { service_config_id: scTrader },
        { service_config_id: scOptimus },
      ],
      selectedAgentType: AgentMap.PredictTrader,
      selectedService: { service_config_id: scTrader },
      selectedServiceConfigId: scTrader,
      updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
    });
    useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
    capturedControllerCallbacks.onAutoRunInstanceStarted = undefined;
    capturedControllerCallbacks.onAutoRunStartStateChange = undefined;
    useAutoRunController.mockImplementation(
      (params: {
        onAutoRunInstanceStarted?: (serviceConfigId: string) => void;
        onAutoRunStartStateChange?: (isStarting: boolean) => void;
      }) => {
        capturedControllerCallbacks.onAutoRunInstanceStarted =
          params.onAutoRunInstanceStarted;
        capturedControllerCallbacks.onAutoRunStartStateChange =
          params.onAutoRunStartStateChange;
        return {
          stopRunningAgent: mockStopRunningAgent,
          runningAgentType: mockControllerRunningAgentType.current,
        };
      },
    );
    useConfiguredAgents.mockReturnValue([
      {
        agentType: AgentMap.PredictTrader,
        agentConfig: AGENT_CONFIG[AgentMap.PredictTrader],
        serviceConfigId: scTrader,
      },
      {
        agentType: AgentMap.Optimus,
        agentConfig: AGENT_CONFIG[AgentMap.Optimus],
        serviceConfigId: scOptimus,
      },
    ]);
    useSelectedEligibility.mockReturnValue({
      isSelectedAgentDetailsLoading: false,
      getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('provides default context values', () => {
    const { result } = renderHook(() => useAutoRunContext(), { wrapper });
    expect(result.current.enabled).toBe(false);
    expect(result.current.isToggling).toBe(false);
    expect(typeof result.current.setEnabled).toBe('function');
    expect(typeof result.current.includeInstance).toBe('function');
    expect(typeof result.current.excludeInstance).toBe('function');
  });

  describe('seeding', () => {
    it('seeds included instances on first initialization', () => {
      mockAutoRunStore.isInitialized = false;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      renderHook(() => useAutoRunContext(), { wrapper });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          isInitialized: true,
          includedInstances: expect.arrayContaining([
            expect.objectContaining({ serviceConfigId: scTrader }),
            expect.objectContaining({ serviceConfigId: scOptimus }),
          ]),
        }),
      );
    });

    it('does not re-seed after initialization', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
      ];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      renderHook(() => useAutoRunContext(), { wrapper });

      const seedCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) => call[0]?.isInitialized === true,
      );
      expect(seedCalls).toHaveLength(0);
    });
  });

  describe('setEnabled', () => {
    it('enables auto-run', () => {
      renderHook(() => useAutoRunContext(), { wrapper });
      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.setEnabled(true);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith({
        enabled: true,
      });
    });

    it('disables auto-run and stops running agent', async () => {
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      await act(async () => {
        result.current.setEnabled(false);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith({
        enabled: false,
      });
      expect(mockStopRunningAgent).toHaveBeenCalled();
    });

    it('does not double-disable when already disabled', () => {
      mockAutoRunStore.enabled = false;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.setEnabled(false);
      });

      expect(mockAutoRunStore.updateAutoRun).not.toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    });
  });

  describe('includeInstance', () => {
    it('adds instance to included list', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
      ];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.includeInstance(scOptimus);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          includedInstances: expect.arrayContaining([
            expect.objectContaining({ serviceConfigId: scTrader }),
            expect.objectContaining({ serviceConfigId: scOptimus }),
          ]),
        }),
      );
    });

    it('removes instance from user-excluded when including', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
      ];
      mockAutoRunStore.userExcludedInstances = [scOptimus];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.includeInstance(scOptimus);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          userExcludedInstances: [],
        }),
      );
    });

    it('does not include ineligible instance', () => {
      useConfiguredAgents.mockReturnValue([
        {
          agentType: AgentMap.PredictTrader,
          agentConfig: AGENT_CONFIG[AgentMap.PredictTrader],
          serviceConfigId: scTrader,
        },
      ]);
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
      ];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.includeInstance(scOptimus);
      });

      const includeCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) =>
          Array.isArray(call[0]?.includedInstances) &&
          (call[0].includedInstances as IncludedAgentInstance[]).some(
            (a: IncludedAgentInstance) => a.serviceConfigId === scOptimus,
          ),
      );
      expect(includeCalls).toHaveLength(0);
    });
  });

  describe('excludeInstance', () => {
    it('removes instance from included and adds to excluded', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
        { serviceConfigId: scOptimus, order: 1 },
      ];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.excludeInstance(scOptimus);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          includedInstances: [{ serviceConfigId: scTrader, order: 0 }],
          userExcludedInstances: [scOptimus],
        }),
      );
    });

    it('prevents excluding the last included instance', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
      ];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.excludeInstance(scTrader);
      });

      const excludeCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) =>
          Array.isArray(call[0]?.userExcludedInstances),
      );
      expect(excludeCalls).toHaveLength(0);
    });
  });

  describe('eligibilityByInstance', () => {
    it('defaults non-selected instances to canRun: true', () => {
      const { result } = renderHook(() => useAutoRunContext(), { wrapper });
      expect(result.current.eligibilityByInstance[scOptimus]).toEqual({
        canRun: true,
      });
    });

    it('uses real eligibility for selected instance', () => {
      useSelectedEligibility.mockReturnValue({
        isSelectedAgentDetailsLoading: false,
        getSelectedEligibility: jest
          .fn()
          .mockReturnValue({ canRun: false, reason: 'Low balance' }),
      });

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });
      expect(result.current.eligibilityByInstance[scTrader]).toEqual({
        canRun: false,
        reason: 'Low balance',
      });
    });

    it('marks decommissioned agents as canRun: false with reason', () => {
      const scModius = 'sc-modius-test';
      useConfiguredAgents.mockReturnValue([
        {
          agentType: AgentMap.PredictTrader,
          agentConfig: AGENT_CONFIG[AgentMap.PredictTrader],
          serviceConfigId: scTrader,
        },
        {
          agentType: AgentMap.Optimus,
          agentConfig: AGENT_CONFIG[AgentMap.Optimus],
          serviceConfigId: scOptimus,
        },
        {
          agentType: AgentMap.Modius,
          agentConfig: {
            ...AGENT_CONFIG[AgentMap.Modius],
            isAgentEnabled: false,
          },
          serviceConfigId: scModius,
        },
      ]);

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });
      expect(result.current.eligibilityByInstance[scModius]).toEqual({
        canRun: false,
        reason: 'Decommissioned',
      });
    });
  });

  describe('onAutoRunInstanceStarted callback', () => {
    it('calls updateSelectedServiceConfigId when instance is configured', () => {
      renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        capturedControllerCallbacks.onAutoRunInstanceStarted!(scTrader);
      });

      expect(mockUpdateSelectedServiceConfigId).toHaveBeenCalledWith(scTrader);
    });

    it('does not call updateSelectedServiceConfigId when instance is not configured', () => {
      useConfiguredAgents.mockReturnValue([
        {
          agentType: AgentMap.PredictTrader,
          agentConfig: AGENT_CONFIG[AgentMap.PredictTrader],
          serviceConfigId: scTrader,
        },
      ]);

      renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        capturedControllerCallbacks.onAutoRunInstanceStarted!(scOptimus);
      });

      expect(mockUpdateSelectedServiceConfigId).not.toHaveBeenCalled();
    });
  });

  describe('onAutoRunStartStateChange callback (isToggling)', () => {
    it('sets isStarting to true via onAutoRunStartStateChange', () => {
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      expect(result.current.isToggling).toBe(true);
    });

    it('resets isStarting when enabled becomes false', () => {
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result, rerender } = renderHook(() => useAutoRunContext(), {
        wrapper,
      });

      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });
      expect(result.current.isToggling).toBe(true);

      mockAutoRunStore.enabled = false;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
      rerender();

      expect(result.current.isToggling).toBe(false);
    });
  });

  describe('disable-race-stop effect', () => {
    it('sets race-stop checks when disabling during a start (isStarting=true, no runningAgent)', async () => {
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      mockAutoRunStore.enabled = false;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      await act(async () => {
        result.current.setEnabled(false);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith({
        enabled: false,
      });
    });

    it('decrements check counter on timeout when no running agent', async () => {
      mockAutoRunStore.enabled = true;
      mockAutoRunStore.updateAutoRun = jest.fn(
        (patch: Record<string, unknown>) => {
          if ('enabled' in patch) {
            mockAutoRunStore.enabled = patch.enabled as boolean;
          }
        },
      );
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), {
        wrapper,
      });

      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      await act(async () => {
        result.current.setEnabled(false);
      });

      await act(async () => {
        jest.advanceTimersByTime(DISABLE_RACE_STOP_CHECK_INTERVAL_MS);
      });

      expect(mockStopRunningAgent).toHaveBeenCalled();
    });
  });

  describe('normalization cleanup effect', () => {
    it('normalizes included instances when changes are detected', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 5 },
        { serviceConfigId: scOptimus, order: 10 },
      ];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      renderHook(() => useAutoRunContext(), { wrapper });

      const normalizeCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) =>
          Array.isArray(call[0]?.includedInstances) &&
          !('isInitialized' in call[0]) &&
          !('userExcludedInstances' in call[0]),
      );
      expect(normalizeCalls.length).toBeGreaterThanOrEqual(1);
      expect(normalizeCalls[0][0].includedInstances).toEqual([
        { serviceConfigId: scTrader, order: 0 },
        { serviceConfigId: scOptimus, order: 1 },
      ]);
    });
  });

  describe('includeInstance — instance already in list', () => {
    it('only updates userExcludedInstances when instance is already included but was excluded', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
        { serviceConfigId: scOptimus, order: 1 },
      ];
      mockAutoRunStore.userExcludedInstances = [scOptimus];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.includeInstance(scOptimus);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith({
        userExcludedInstances: [],
      });
    });

    it('does nothing when instance is already included and not in excluded list', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
        { serviceConfigId: scOptimus, order: 1 },
      ];
      mockAutoRunStore.userExcludedInstances = [];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });
      mockAutoRunStore.updateAutoRun.mockClear();

      act(() => {
        result.current.includeInstance(scOptimus);
      });

      expect(mockAutoRunStore.updateAutoRun).not.toHaveBeenCalled();
    });
  });

  describe('excludeInstance — already in userExcludedInstances', () => {
    it('does not duplicate instance in userExcludedInstances when already present', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedInstances = [
        { serviceConfigId: scTrader, order: 0 },
        { serviceConfigId: scOptimus, order: 1 },
      ];
      mockAutoRunStore.userExcludedInstances = [scOptimus];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.excludeInstance(scOptimus);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          userExcludedInstances: [scOptimus],
        }),
      );
    });
  });

  describe('guard branches — services/eligibility', () => {
    it('does not seed when services is undefined', () => {
      useServices.mockReturnValue({
        services: undefined,
        selectedAgentType: AgentMap.PredictTrader,
        selectedService: undefined,
        selectedServiceConfigId: null,
        updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
      });

      renderHook(() => useAutoRunContext(), { wrapper });

      expect(mockAutoRunStore.updateAutoRun).not.toHaveBeenCalledWith(
        expect.objectContaining({ isInitialized: true }),
      );
    });

    it('does not seed when no eligible agents', () => {
      useConfiguredAgents.mockReturnValue([
        {
          agentType: AgentMap.PredictTrader,
          agentConfig: {
            ...AGENT_CONFIG[AgentMap.PredictTrader],
            isAgentEnabled: false,
          },
          serviceConfigId: scTrader,
        },
      ]);

      renderHook(() => useAutoRunContext(), { wrapper });

      expect(mockAutoRunStore.updateAutoRun).not.toHaveBeenCalledWith(
        expect.objectContaining({ isInitialized: true }),
      );
    });

    it('uses null for selectedServiceConfigId when selectedService is undefined', () => {
      useServices.mockReturnValue({
        services: [{ service_config_id: scTrader }],
        selectedAgentType: AgentMap.PredictTrader,
        selectedService: undefined,
        selectedServiceConfigId: null,
        updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
      });

      renderHook(() => useAutoRunContext(), { wrapper });

      const controllerArgs = useAutoRunController.mock.calls[0][0] as {
        selectedServiceConfigId: string | null;
      };
      expect(controllerArgs.selectedServiceConfigId).toBeNull();
    });
  });

  describe('setEnabled — isStopping guard', () => {
    it('skips stopRunningAgent call when already stopping', async () => {
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      let resolveStop!: () => void;
      const pendingStop = new Promise<boolean>((resolve) => {
        resolveStop = () => resolve(true);
      });
      mockStopRunningAgent.mockReturnValueOnce(pendingStop);

      const { result, rerender } = renderHook(() => useAutoRunContext(), {
        wrapper,
      });

      act(() => {
        result.current.setEnabled(false);
      });
      expect(mockStopRunningAgent).toHaveBeenCalledTimes(1);

      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
      rerender();

      act(() => {
        result.current.setEnabled(false);
      });

      expect(mockStopRunningAgent).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveStop();
      });
    });
  });
});
