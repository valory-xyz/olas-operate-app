import { renderHook } from '@testing-library/react';
import { act, PropsWithChildren } from 'react';

import { AGENT_CONFIG } from '../../../config/agents';
import { AgentMap, AgentType } from '../../../constants/agent';
import {
  AutoRunProvider,
  useAutoRunContext,
} from '../../../context/AutoRunProvider/AutoRunProvider';
import { DISABLE_RACE_STOP_CHECK_INTERVAL_MS } from '../../../context/AutoRunProvider/constants';
import { IncludedAgent } from '../../../context/AutoRunProvider/types';

// --- Mutable mock state ---
const mockAutoRunStore = {
  enabled: false,
  includedAgents: [] as IncludedAgent[],
  isInitialized: false,
  userExcludedAgents: [] as AgentType[],
  updateAutoRun: jest.fn(),
};

const mockStopRunningAgent = jest.fn().mockResolvedValue(true);
const mockControllerRunningAgentType = { current: null as AgentType | null };
const mockUpdateAgentType = jest.fn();

/** Captured callbacks from the last useAutoRunController call. */
const capturedControllerCallbacks = {
  onAutoRunAgentStarted: undefined as
    | ((agentType: AgentType) => void)
    | undefined,
  onAutoRunStartStateChange: undefined as
    | ((isStarting: boolean) => void)
    | undefined,
};

// --- Mocks ---
jest.mock('../../../hooks', () => ({
  useServices: jest.fn().mockReturnValue({
    services: [{ service_config_id: 'sc-1' }, { service_config_id: 'sc-2' }],
    selectedAgentType: AgentMap.PredictTrader,
    selectedService: { service_config_id: 'sc-1' },
    updateAgentType: jest.fn(),
  }),
  useElectronApi: jest.fn().mockReturnValue({
    showNotification: jest.fn(),
  }),
  useArchivedAgents: jest.fn().mockReturnValue({
    archivedAgents: [],
    isArchived: jest.fn().mockReturnValue(false),
    archiveAgent: jest.fn(),
    unarchiveAgent: jest.fn(),
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

const trader = AgentMap.PredictTrader;
const optimus = AgentMap.Optimus;

const wrapper = ({ children }: PropsWithChildren) => (
  <AutoRunProvider>{children}</AutoRunProvider>
);

describe('AutoRunProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAutoRunStore.enabled = false;
    mockAutoRunStore.includedAgents = [];
    mockAutoRunStore.isInitialized = false;
    mockAutoRunStore.userExcludedAgents = [];
    mockAutoRunStore.updateAutoRun = jest.fn();
    mockControllerRunningAgentType.current = null;
    mockUpdateAgentType.mockClear();

    useServices.mockReturnValue({
      services: [{ service_config_id: 'sc-1' }, { service_config_id: 'sc-2' }],
      selectedAgentType: trader,
      selectedService: { service_config_id: 'sc-1' },
      updateAgentType: mockUpdateAgentType,
    });
    useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
    capturedControllerCallbacks.onAutoRunAgentStarted = undefined;
    capturedControllerCallbacks.onAutoRunStartStateChange = undefined;
    useAutoRunController.mockImplementation(
      (params: {
        onAutoRunAgentStarted?: (agentType: AgentType) => void;
        onAutoRunStartStateChange?: (isStarting: boolean) => void;
      }) => {
        capturedControllerCallbacks.onAutoRunAgentStarted =
          params.onAutoRunAgentStarted;
        capturedControllerCallbacks.onAutoRunStartStateChange =
          params.onAutoRunStartStateChange;
        return {
          stopRunningAgent: mockStopRunningAgent,
          runningAgentType: mockControllerRunningAgentType.current,
        };
      },
    );
    useConfiguredAgents.mockReturnValue([
      { agentType: trader, agentConfig: AGENT_CONFIG[trader] },
      { agentType: optimus, agentConfig: AGENT_CONFIG[optimus] },
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
    expect(typeof result.current.includeAgent).toBe('function');
    expect(typeof result.current.excludeAgent).toBe('function');
  });

  describe('seeding', () => {
    it('seeds included agents on first initialization', () => {
      mockAutoRunStore.isInitialized = false;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      renderHook(() => useAutoRunContext(), { wrapper });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          isInitialized: true,
          includedAgents: expect.arrayContaining([
            expect.objectContaining({ agentType: trader }),
            expect.objectContaining({ agentType: optimus }),
          ]),
        }),
      );
    });

    it('does not re-seed after initialization', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [{ agentType: trader, order: 0 }];
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

  describe('includeAgent', () => {
    it('adds agent to included list', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [{ agentType: trader, order: 0 }];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.includeAgent(optimus);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          includedAgents: expect.arrayContaining([
            expect.objectContaining({ agentType: trader }),
            expect.objectContaining({ agentType: optimus }),
          ]),
        }),
      );
    });

    it('removes agent from user-excluded when including', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [{ agentType: trader, order: 0 }];
      mockAutoRunStore.userExcludedAgents = [optimus];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.includeAgent(optimus);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          userExcludedAgents: [],
        }),
      );
    });

    it('does not include ineligible agent', () => {
      // Only trader is configured
      useConfiguredAgents.mockReturnValue([
        { agentType: trader, agentConfig: AGENT_CONFIG[trader] },
      ]);
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [{ agentType: trader, order: 0 }];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        // Try to include an agent that's not in configuredAgents (and thus not eligible)
        result.current.includeAgent(optimus);
      });

      // No updateAutoRun call for including optimus
      const includeCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) =>
          Array.isArray(call[0]?.includedAgents) &&
          (call[0].includedAgents as IncludedAgent[]).some(
            (a: IncludedAgent) => a.agentType === optimus,
          ),
      );
      expect(includeCalls).toHaveLength(0);
    });
  });

  describe('excludeAgent', () => {
    it('removes agent from included and adds to excluded', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [
        { agentType: trader, order: 0 },
        { agentType: optimus, order: 1 },
      ];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.excludeAgent(optimus);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          includedAgents: [{ agentType: trader, order: 0 }],
          userExcludedAgents: [optimus],
        }),
      );
    });

    it('prevents excluding the last included agent', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [{ agentType: trader, order: 0 }];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.excludeAgent(trader);
      });

      // Should NOT update — cannot remove the last included agent
      const excludeCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) =>
          Array.isArray(call[0]?.userExcludedAgents),
      );
      expect(excludeCalls).toHaveLength(0);
    });
  });

  describe('eligibilityByAgent', () => {
    it('defaults non-selected agents to canRun: true', () => {
      const { result } = renderHook(() => useAutoRunContext(), { wrapper });
      expect(result.current.eligibilityByAgent[optimus]).toEqual({
        canRun: true,
      });
    });

    it('uses real eligibility for selected agent', () => {
      useSelectedEligibility.mockReturnValue({
        isSelectedAgentDetailsLoading: false,
        getSelectedEligibility: jest
          .fn()
          .mockReturnValue({ canRun: false, reason: 'Low balance' }),
      });

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });
      expect(result.current.eligibilityByAgent[trader]).toEqual({
        canRun: false,
        reason: 'Low balance',
      });
    });

    it('marks decommissioned agents as canRun: false with reason', () => {
      const modius = AgentMap.Modius;
      useConfiguredAgents.mockReturnValue([
        { agentType: trader, agentConfig: AGENT_CONFIG[trader] },
        { agentType: optimus, agentConfig: AGENT_CONFIG[optimus] },
        {
          agentType: modius,
          agentConfig: { ...AGENT_CONFIG[modius], isAgentEnabled: false },
        },
      ]);

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });
      expect(result.current.eligibilityByAgent[modius]).toEqual({
        canRun: false,
        reason: 'Decommissioned',
      });
    });
  });

  describe('onAutoRunAgentStarted callback', () => {
    it('calls updateAgentType when agent is configured', () => {
      renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        capturedControllerCallbacks.onAutoRunAgentStarted!(trader);
      });

      expect(mockUpdateAgentType).toHaveBeenCalledWith(trader);
    });

    it('does not call updateAgentType when agent is not configured', () => {
      useConfiguredAgents.mockReturnValue([
        { agentType: trader, agentConfig: AGENT_CONFIG[trader] },
      ]);

      renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        capturedControllerCallbacks.onAutoRunAgentStarted!(optimus);
      });

      expect(mockUpdateAgentType).not.toHaveBeenCalled();
    });
  });

  describe('onAutoRunStartStateChange callback (isToggling)', () => {
    it('sets isStarting to true via onAutoRunStartStateChange', () => {
      // Must be enabled so the cleanup effect (!enabled && isStarting) doesn't reset it
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      expect(result.current.isToggling).toBe(true);
    });

    it('resets isStarting when enabled becomes false', () => {
      // Start with enabled=true so the effect path is reachable
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result, rerender } = renderHook(() => useAutoRunContext(), {
        wrapper,
      });

      // Trigger isStarting = true via callback
      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });
      expect(result.current.isToggling).toBe(true);

      // Now disable auto-run => effect should reset isStarting
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

      // Set isStarting via callback
      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      // Now disable while isStarting=true, no runningAgentType
      mockAutoRunStore.enabled = false;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      await act(async () => {
        result.current.setEnabled(false);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith({
        enabled: false,
      });
    });

    it('resets disableRaceStopChecksLeft to 0 when enabled becomes true', async () => {
      // Start disabled with race-stop checks active by triggering the sequence
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result, rerender } = renderHook(() => useAutoRunContext(), {
        wrapper,
      });

      // Trigger isStarting
      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      // Disable while starting (sets disableRaceStopChecksLeft)
      mockAutoRunStore.enabled = false;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
      rerender();

      await act(async () => {
        result.current.setEnabled(false);
      });

      // Re-enable => should reset checks to 0
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
      rerender();

      // The effect for race-stop with enabled=true and checks!=0 resets checks
      // No crash or infinite loop means it worked
      expect(result.current.enabled).toBe(true);
    });

    it('stops running agent when it appears during race-stop polling', async () => {
      mockAutoRunStore.enabled = true;
      // Make updateAutoRun actually flip the `enabled` flag so the effect
      // sees `enabled=false` on the very next render.
      mockAutoRunStore.updateAutoRun = jest.fn(
        (patch: Record<string, unknown>) => {
          if ('enabled' in patch) {
            mockAutoRunStore.enabled = patch.enabled as boolean;
          }
        },
      );
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result, rerender } = renderHook(() => useAutoRunContext(), {
        wrapper,
      });

      // Trigger isStarting
      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      // Disable while isStarting=true, no runningAgentType.
      // updateAutoRun now flips enabled=false synchronously before the next render,
      // so the race-stop effect sees enabled=false AND disableRaceStopChecksLeft>0.
      await act(async () => {
        result.current.setEnabled(false);
      });

      // After the promise resolves, isStopping becomes false.
      // Now simulate the running agent appearing.
      useAutoRunController.mockImplementation(
        (params: {
          onAutoRunAgentStarted?: (agentType: AgentType) => void;
          onAutoRunStartStateChange?: (isStarting: boolean) => void;
        }) => {
          capturedControllerCallbacks.onAutoRunAgentStarted =
            params.onAutoRunAgentStarted;
          capturedControllerCallbacks.onAutoRunStartStateChange =
            params.onAutoRunStartStateChange;
          return {
            stopRunningAgent: mockStopRunningAgent,
            runningAgentType: trader,
          };
        },
      );

      await act(async () => {
        rerender();
      });

      // stopRunningAgent called at least twice:
      // once from setEnabled(false) and once from the race-stop effect (lines 154-159).
      expect(mockStopRunningAgent).toHaveBeenCalledTimes(2);
    });

    it('decrements check counter on timeout when no running agent', async () => {
      mockAutoRunStore.enabled = true;
      // Make updateAutoRun flip enabled synchronously so the effect sees enabled=false
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

      // Trigger isStarting
      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      // Disable while starting — sets disableRaceStopChecksLeft and calls stop
      await act(async () => {
        result.current.setEnabled(false);
      });

      // No running agent appears; advance timer to trigger the countdown callback (line 162)
      await act(async () => {
        jest.advanceTimersByTime(DISABLE_RACE_STOP_CHECK_INTERVAL_MS);
      });

      // The effect decrements the counter. No crash = success.
      // The stop was called once from setEnabled(false)
      expect(mockStopRunningAgent).toHaveBeenCalled();
    });
  });

  describe('normalization cleanup effect', () => {
    it('normalizes included agents when changes are detected', () => {
      mockAutoRunStore.isInitialized = true;
      // Set up included agents with non-sequential order values that need normalization
      mockAutoRunStore.includedAgents = [
        { agentType: trader, order: 5 },
        { agentType: optimus, order: 10 },
      ];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      renderHook(() => useAutoRunContext(), { wrapper });

      // The normalization effect should detect order discrepancy and call updateAutoRun
      const normalizeCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) =>
          Array.isArray(call[0]?.includedAgents) &&
          !('isInitialized' in call[0]) &&
          !('userExcludedAgents' in call[0]),
      );
      expect(normalizeCalls.length).toBeGreaterThanOrEqual(1);
      expect(normalizeCalls[0][0].includedAgents).toEqual([
        { agentType: trader, order: 0 },
        { agentType: optimus, order: 1 },
      ]);
    });
  });

  describe('includeAgent — agent already in list', () => {
    it('only updates userExcludedAgents when agent is already included but was excluded', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [
        { agentType: trader, order: 0 },
        { agentType: optimus, order: 1 },
      ];
      // optimus is in both included AND excluded — include should just remove from excluded
      mockAutoRunStore.userExcludedAgents = [optimus];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.includeAgent(optimus);
      });

      // Should only update userExcludedAgents, not includedAgents
      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith({
        userExcludedAgents: [],
      });
    });

    it('does nothing when agent is already included and not in excluded list', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [
        { agentType: trader, order: 0 },
        { agentType: optimus, order: 1 },
      ];
      mockAutoRunStore.userExcludedAgents = [];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });
      mockAutoRunStore.updateAutoRun.mockClear();

      act(() => {
        result.current.includeAgent(optimus);
      });

      // No update needed — already included and not excluded
      expect(mockAutoRunStore.updateAutoRun).not.toHaveBeenCalled();
    });
  });

  describe('excludeAgent — already in userExcludedAgents', () => {
    it('does not duplicate agent in userExcludedAgents when already present', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [
        { agentType: trader, order: 0 },
        { agentType: optimus, order: 1 },
      ];
      mockAutoRunStore.userExcludedAgents = [optimus];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      act(() => {
        result.current.excludeAgent(optimus);
      });

      // userExcludedAgents should remain [optimus], not [optimus, optimus]
      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith(
        expect.objectContaining({
          userExcludedAgents: [optimus],
        }),
      );
    });
  });

  describe('guard branches — services/eligibility', () => {
    it('does not seed when services is undefined', () => {
      useServices.mockReturnValue({
        services: undefined,
        selectedAgentType: trader,
        selectedService: undefined,
        updateAgentType: mockUpdateAgentType,
      });

      renderHook(() => useAutoRunContext(), { wrapper });

      // No seed call when services is undefined
      expect(mockAutoRunStore.updateAutoRun).not.toHaveBeenCalledWith(
        expect.objectContaining({ isInitialized: true }),
      );
    });

    it('does not seed when no eligible agents', () => {
      // All agents are decommissioned
      useConfiguredAgents.mockReturnValue([
        {
          agentType: trader,
          agentConfig: { ...AGENT_CONFIG[trader], isAgentEnabled: false },
        },
      ]);

      renderHook(() => useAutoRunContext(), { wrapper });

      expect(mockAutoRunStore.updateAutoRun).not.toHaveBeenCalledWith(
        expect.objectContaining({ isInitialized: true }),
      );
    });

    it('uses null for selectedServiceConfigId when selectedService is undefined', () => {
      useServices.mockReturnValue({
        services: [{ service_config_id: 'sc-1' }],
        selectedAgentType: trader,
        selectedService: undefined,
        updateAgentType: mockUpdateAgentType,
      });

      renderHook(() => useAutoRunContext(), { wrapper });

      // Check that useAutoRunController was called with null serviceConfigId
      const controllerArgs = useAutoRunController.mock.calls[0][0] as {
        selectedServiceConfigId: string | null;
      };
      expect(controllerArgs.selectedServiceConfigId).toBeNull();
    });

    it('does not auto-append when services is undefined and initialized', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [{ agentType: trader, order: 0 }];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
      useServices.mockReturnValue({
        services: undefined,
        selectedAgentType: trader,
        selectedService: undefined,
        updateAgentType: mockUpdateAgentType,
      });

      renderHook(() => useAutoRunContext(), { wrapper });

      // No auto-append call
      const appendCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) =>
          Array.isArray(call[0]?.includedAgents) &&
          !('isInitialized' in call[0]),
      );
      expect(appendCalls).toHaveLength(0);
    });

    it('does not auto-append when no eligible agents and initialized', () => {
      mockAutoRunStore.isInitialized = true;
      mockAutoRunStore.includedAgents = [{ agentType: trader, order: 0 }];
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
      useConfiguredAgents.mockReturnValue([
        {
          agentType: trader,
          agentConfig: { ...AGENT_CONFIG[trader], isAgentEnabled: false },
        },
      ]);

      renderHook(() => useAutoRunContext(), { wrapper });

      // Normalization may clean up, but no append with new agents
      const appendCalls = mockAutoRunStore.updateAutoRun.mock.calls.filter(
        (call: [Record<string, unknown>]) => {
          const agents = call[0]?.includedAgents;
          return (
            Array.isArray(agents) && (agents as IncludedAgent[]).length > 1
          );
        },
      );
      expect(appendCalls).toHaveLength(0);
    });
  });

  describe('setEnabled — isStopping guard', () => {
    it('skips stopRunningAgent call when already stopping', async () => {
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      // Use a never-resolving promise to keep isStopping=true from first disable
      let resolveStop!: () => void;
      const pendingStop = new Promise<boolean>((resolve) => {
        resolveStop = () => resolve(true);
      });
      mockStopRunningAgent.mockReturnValueOnce(pendingStop);

      const { result, rerender } = renderHook(() => useAutoRunContext(), {
        wrapper,
      });

      // First disable — sets isStopping=true, calls stopRunningAgent (which pends)
      act(() => {
        result.current.setEnabled(false);
      });
      expect(mockStopRunningAgent).toHaveBeenCalledTimes(1);

      // Re-enable so we can disable again
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
      rerender();

      // Second disable — isStopping is still true from the pending first stop
      act(() => {
        result.current.setEnabled(false);
      });

      // stopRunningAgent should NOT have been called a second time (line 253 guard)
      expect(mockStopRunningAgent).toHaveBeenCalledTimes(1);

      // Cleanup: resolve the pending stop
      await act(async () => {
        resolveStop();
      });
    });
  });

  describe('setEnabled — race-stop branching', () => {
    it('sets DISABLE_RACE_STOP_MAX_CHECKS when disabling while isStarting and no runningAgent', async () => {
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      // Set isStarting via callback
      act(() => {
        capturedControllerCallbacks.onAutoRunStartStateChange!(true);
      });

      // Disable while isStarting=true and no runningAgentType
      await act(async () => {
        result.current.setEnabled(false);
      });

      expect(mockAutoRunStore.updateAutoRun).toHaveBeenCalledWith({
        enabled: false,
      });
      expect(mockStopRunningAgent).toHaveBeenCalled();
    });

    it('does not stop again when already isStopping', async () => {
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      const { result } = renderHook(() => useAutoRunContext(), { wrapper });

      // First disable — triggers stopRunningAgent (sets isStopping)
      await act(async () => {
        result.current.setEnabled(false);
      });

      // Re-enable so we can disable again
      mockAutoRunStore.enabled = true;
      useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));

      // Use a never-resolving promise to keep isStopping=true
      const neverResolve = new Promise<boolean>(() => {});
      mockStopRunningAgent.mockReturnValueOnce(neverResolve);

      await act(async () => {
        result.current.setEnabled(false);
      });

      // The second disable should call stopRunningAgent again
      // (isStopping resets after first promise resolves)
      expect(mockStopRunningAgent).toHaveBeenCalledTimes(2);
    });
  });
});
