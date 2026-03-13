import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap, AgentType } from '../../../../constants/agent';
import { useAutoRunOperations } from '../../../../context/AutoRunProvider/hooks/useAutoRunOperations';
import { makeAutoRunAgentMeta } from '../../../helpers/factories';

// Mock sub-hooks since this is a composition hook
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunStartOperations',
  () => ({
    useAutoRunStartOperations: jest.fn().mockReturnValue({
      startAgentWithRetries: jest.fn().mockResolvedValue({ status: 'started' }),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunStopOperations',
  () => ({
    useAutoRunStopOperations: jest.fn().mockReturnValue({
      stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunVerboseLogger',
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  () => require('../../../helpers/autoRunMocks').verboseLoggerMockFactory(),
);
jest.mock('../../../../context/AutoRunProvider/utils/autoRunHelpers', () => ({
  refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../../../context/AutoRunProvider/utils/utils', () => ({
  getAgentDisplayName: jest.fn().mockReturnValue('Omenstrat'),
  notifySkipped: jest.fn(),
}));

const makeHookParams = () => ({
  enabled: true,
  enabledRef: { current: true },
  runningAgentTypeRef: { current: null as AgentType | null },
  configuredAgents: [
    makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    ),
  ],
  updateAgentType: jest.fn(),
  getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
  createSafeIfNeeded: jest.fn().mockResolvedValue(undefined),
  showNotification: jest.fn(),
  onAutoRunAgentStarted: jest.fn(),
  onAutoRunStartStateChange: jest.fn(),
  startService: jest.fn().mockResolvedValue(undefined),
  waitForAgentSelection: jest.fn().mockResolvedValue(true),
  waitForBalancesReady: jest.fn().mockResolvedValue(true),
  waitForRunningAgent: jest.fn().mockResolvedValue(true),
  getBalancesStatus: jest.fn().mockReturnValue({ ready: true, loading: false }),
  getRewardSnapshot: jest.fn().mockReturnValue(undefined),
  setRewardSnapshot: jest.fn(),
  recordMetric: jest.fn(),
  logMessage: jest.fn(),
});

describe('useAutoRunOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes refreshRewardsEligibility, notifySkipOnce, startAgentWithRetries, stopAgentWithRecovery', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunOperations(params));
    expect(typeof result.current.refreshRewardsEligibility).toBe('function');
    expect(typeof result.current.notifySkipOnce).toBe('function');
    expect(typeof result.current.startAgentWithRetries).toBe('function');
    expect(typeof result.current.stopAgentWithRecovery).toBe('function');
  });

  describe('notifySkipOnce', () => {
    it('does not notify when reason is undefined', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));
      act(() => {
        result.current.notifySkipOnce(AgentMap.PredictTrader, undefined);
      });
      expect(params.showNotification).not.toHaveBeenCalled();
    });

    it('does not notify for loading reasons', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));
      act(() => {
        result.current.notifySkipOnce(
          AgentMap.PredictTrader,
          'Loading: Balances',
          true,
        );
      });
      expect(params.logMessage).not.toHaveBeenCalled();
    });

    it('notifies once per reason per agent', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));
      act(() => {
        result.current.notifySkipOnce(AgentMap.PredictTrader, 'Low balance');
      });
      act(() => {
        result.current.notifySkipOnce(AgentMap.PredictTrader, 'Low balance');
      });
      // Only logged once (dedup)
      expect(params.logMessage).toHaveBeenCalledTimes(1);
    });

    it('notifies again for different reason', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunOperations(params));
      act(() => {
        result.current.notifySkipOnce(AgentMap.PredictTrader, 'Low balance');
      });
      act(() => {
        result.current.notifySkipOnce(AgentMap.PredictTrader, 'Evicted');
      });
      expect(params.logMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('skip notification reset on disable', () => {
    it('resets skip notifications when auto-run is disabled', () => {
      const params = makeHookParams();
      const { result, rerender } = renderHook(
        ({ enabled }) => useAutoRunOperations({ ...params, enabled }),
        { initialProps: { enabled: true } },
      );

      act(() => {
        result.current.notifySkipOnce(AgentMap.PredictTrader, 'Low balance');
      });
      expect(params.logMessage).toHaveBeenCalledTimes(1);

      // Disable auto-run → resets dedup state
      rerender({ enabled: false });

      // Re-enable
      rerender({ enabled: true });

      // Same reason should notify again after reset
      act(() => {
        result.current.notifySkipOnce(AgentMap.PredictTrader, 'Low balance');
      });
      expect(params.logMessage).toHaveBeenCalledTimes(2);
    });
  });
});
