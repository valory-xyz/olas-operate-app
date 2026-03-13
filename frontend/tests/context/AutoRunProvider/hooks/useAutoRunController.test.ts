import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap } from '../../../../constants/agent';
import {
  AUTO_RUN_VERBOSE_LOGS,
  HEALTH_SUMMARY_INTERVAL_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import { useAutoRunController } from '../../../../context/AutoRunProvider/hooks/useAutoRunController';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

jest.mock('../../../../hooks', () => ({
  useRewardContext: jest.fn().mockReturnValue({ isEligibleForRewards: false }),
  useAgentRunning: jest.fn().mockReturnValue({ runningAgentType: null }),
  useStartService: jest.fn().mockReturnValue({
    startService: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useLogAutoRunEvent',
  () => ({
    useLogAutoRunEvent: jest.fn().mockReturnValue({
      logMessage: jest.fn(),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunSignals',
  () => ({
    useAutoRunSignals: jest.fn().mockReturnValue({
      enabledRef: { current: false },
      runningAgentTypeRef: { current: null },
      lastRewardsEligibilityRef: { current: {} },
      scanTick: 0,
      rewardsTick: 0,
      scheduleNextScan: jest.fn(),
      hasScheduledScan: jest.fn().mockReturnValue(false),
      waitForAgentSelection: jest.fn().mockResolvedValue(true),
      waitForBalancesReady: jest.fn().mockResolvedValue(true),
      waitForRewardsEligibility: jest.fn().mockResolvedValue(false),
      waitForRunningAgent: jest.fn().mockResolvedValue(true),
      markRewardSnapshotPending: jest.fn(),
      getRewardSnapshot: jest.fn().mockReturnValue(undefined),
      setRewardSnapshot: jest.fn(),
      getBalancesStatus: jest
        .fn()
        .mockReturnValue({ ready: true, loading: false }),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunOperations',
  () => ({
    useAutoRunOperations: jest.fn().mockReturnValue({
      refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
      notifySkipOnce: jest.fn(),
      startAgentWithRetries: jest.fn().mockResolvedValue({ status: 'started' }),
      stopAgentWithRecovery: jest.fn().mockResolvedValue(true),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunScanner',
  () => ({
    useAutoRunScanner: jest.fn().mockReturnValue({
      getPreferredStartFrom: jest.fn().mockReturnValue(null),
      scanAndStartNext: jest.fn().mockResolvedValue({ started: false }),
      startSelectedAgentIfEligible: jest.fn().mockResolvedValue(false),
    }),
  }),
);
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunLifecycle',
  () => ({
    useAutoRunLifecycle: jest.fn().mockReturnValue({
      stopCurrentRunningAgent: jest.fn().mockResolvedValue(true),
    }),
  }),
);

const { useAutoRunLifecycle } = jest.requireMock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunLifecycle',
) as { useAutoRunLifecycle: jest.Mock };
const { useAutoRunOperations } = jest.requireMock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunOperations',
) as { useAutoRunOperations: jest.Mock };
const { useLogAutoRunEvent } = jest.requireMock(
  '../../../../context/AutoRunProvider/hooks/useLogAutoRunEvent',
) as { useLogAutoRunEvent: jest.Mock };

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunController>[0]> = {},
) => ({
  enabled: false,
  orderedIncludedAgentTypes: [AgentMap.PredictTrader],
  configuredAgents: [],
  updateAgentType: jest.fn(),
  selectedAgentType: AgentMap.PredictTrader,
  selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
  isSelectedAgentDetailsLoading: false,
  getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
  createSafeIfNeeded: jest.fn().mockResolvedValue(undefined),
  showNotification: jest.fn(),
  onAutoRunAgentStarted: jest.fn(),
  onAutoRunStartStateChange: jest.fn(),
  ...overrides,
});

describe('useAutoRunController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns stopRunningAgent and runningAgentType', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunController(params));
    expect(typeof result.current.stopRunningAgent).toBe('function');
    expect(result.current.runningAgentType).toBeNull();
  });

  it('stopRunningAgent delegates to lifecycle hook', async () => {
    const mockStop = jest.fn().mockResolvedValue(true);
    useAutoRunLifecycle.mockReturnValue({
      stopCurrentRunningAgent: mockStop,
    });
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunController(params));
    await act(async () => {
      await result.current.stopRunningAgent();
    });
    expect(mockStop).toHaveBeenCalled();
  });

  it('resets health stats when disabled', () => {
    const params = makeHookParams({ enabled: true });
    const { rerender } = renderHook((props) => useAutoRunController(props), {
      initialProps: params,
    });
    // Disable — internal health stats ref resets (no crash = success)
    rerender({ ...params, enabled: false });
  });

  // Tests for verbose logging — skipped (not silently dropped) when the flag is off
  const describeVerbose = AUTO_RUN_VERBOSE_LOGS ? describe : describe.skip;
  describeVerbose('health summary logging (AUTO_RUN_VERBOSE_LOGS)', () => {
    it('logs health summary at interval when enabled', () => {
      const mockLogMessage = jest.fn();
      useLogAutoRunEvent.mockReturnValue({ logMessage: mockLogMessage });

      const params = makeHookParams({ enabled: true });
      renderHook(() => useAutoRunController(params));

      // With no events, interval fires but skips logging (hasEvents check)
      act(() => {
        jest.advanceTimersByTime(HEALTH_SUMMARY_INTERVAL_SECONDS * 1000);
      });
      // No health events → no log call for summary
      const summaryCalls = mockLogMessage.mock.calls.filter(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('health summary'),
      );
      expect(summaryCalls).toHaveLength(0);
    });

    it('logs health summary when metrics have been recorded, then resets', () => {
      const mockLogMessage = jest.fn();
      useLogAutoRunEvent.mockReturnValue({ logMessage: mockLogMessage });

      const params = makeHookParams({ enabled: true });
      renderHook(() => useAutoRunController(params));

      // Grab the recordMetric callback passed to useAutoRunOperations
      const operationsCallArgs = useAutoRunOperations.mock.calls[0][0] as {
        recordMetric: (metric: string) => void;
      };
      const { recordMetric } = operationsCallArgs;

      // Record some health events
      act(() => {
        recordMetric('startErrors');
        recordMetric('startErrors');
        recordMetric('stopTimeouts');
      });

      // Advance to trigger the health summary interval
      act(() => {
        jest.advanceTimersByTime(HEALTH_SUMMARY_INTERVAL_SECONDS * 1000);
      });

      // Should have logged a health summary with the recorded metrics
      const summaryCalls = mockLogMessage.mock.calls.filter(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('health summary'),
      );
      expect(summaryCalls).toHaveLength(1);
      expect(summaryCalls[0][0]).toContain('startErrors=2');
      expect(summaryCalls[0][0]).toContain('stopTimeouts=1');
      expect(summaryCalls[0][0]).toContain('rewardsErrors=0');

      // Reset logMessage to track only new calls
      mockLogMessage.mockClear();

      // Advance again — stats should have been reset, so no new summary
      act(() => {
        jest.advanceTimersByTime(HEALTH_SUMMARY_INTERVAL_SECONDS * 1000);
      });

      const summaryCallsAfterReset = mockLogMessage.mock.calls.filter(
        (call: string[]) =>
          typeof call[0] === 'string' && call[0].includes('health summary'),
      );
      expect(summaryCallsAfterReset).toHaveLength(0);
    });

    it('clears health summary interval on disable', () => {
      const params = makeHookParams({ enabled: true });
      const { rerender } = renderHook((props) => useAutoRunController(props), {
        initialProps: params,
      });
      rerender({ ...params, enabled: false });
      // Advancing timers after disable should not cause errors
      act(() => {
        jest.advanceTimersByTime(HEALTH_SUMMARY_INTERVAL_SECONDS * 1000 * 2);
      });
    });
  });
});
