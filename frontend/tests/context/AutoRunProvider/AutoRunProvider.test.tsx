import { renderHook } from '@testing-library/react';
import { act, PropsWithChildren } from 'react';

import { AGENT_CONFIG } from '../../../config/agents';
import { AgentMap, AgentType } from '../../../constants/agent';
import {
  AutoRunProvider,
  useAutoRunContext,
} from '../../../context/AutoRunProvider/AutoRunProvider';
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

const trader = AgentMap.PredictTrader;
const optimus = AgentMap.Optimus;

const wrapper = ({ children }: PropsWithChildren) => (
  <AutoRunProvider>{children}</AutoRunProvider>
);

describe('AutoRunProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAutoRunStore.enabled = false;
    mockAutoRunStore.includedAgents = [];
    mockAutoRunStore.isInitialized = false;
    mockAutoRunStore.userExcludedAgents = [];
    mockAutoRunStore.updateAutoRun = jest.fn();
    mockControllerRunningAgentType.current = null;

    useAutoRunStore.mockImplementation(() => ({ ...mockAutoRunStore }));
    useConfiguredAgents.mockReturnValue([
      { agentType: trader, agentConfig: AGENT_CONFIG[trader] },
      { agentType: optimus, agentConfig: AGENT_CONFIG[optimus] },
    ]);
    useSelectedEligibility.mockReturnValue({
      isSelectedAgentDetailsLoading: false,
      getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
    });
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
  });
});
