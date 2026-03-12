import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap, AgentType } from '../../../../constants/agent';
import {
  AGENT_SELECTION_WAIT_TIMEOUT_SECONDS,
  REWARDS_POLL_SECONDS,
  REWARDS_WAIT_TIMEOUT_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import { useAutoRunSignals } from '../../../../context/AutoRunProvider/hooks/useAutoRunSignals';
import { useBalanceAndRefillRequirementsContext } from '../../../../hooks';
import * as delayModule from '../../../../utils/delay';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

const BALANCE_STALENESS_MS = REWARDS_POLL_SECONDS * 1000;
const BALANCES_WAIT_TIMEOUT_SECONDS = AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 3;

jest.mock('../../../../hooks', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));
jest.mock('../../../../utils/delay', () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../helpers/autoRunMocks').delayMockFactory(),
);

const mockUseBalanceContext =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;
const mockSleepAwareDelay = delayModule.sleepAwareDelay as jest.Mock;

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunSignals>[0]> = {},
) => ({
  enabled: true,
  runningAgentType: null as AgentType | null,
  isSelectedAgentDetailsLoading: false,
  isEligibleForRewards: undefined as boolean | undefined,
  selectedAgentType: AgentMap.PredictTrader,
  selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID as string | null,
  logMessage: jest.fn(),
  ...overrides,
});

describe('useAutoRunSignals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseBalanceContext.mockReturnValue({
      isBalancesAndFundingRequirementsLoadingForAllServices: false,
      isBalancesAndFundingRequirementsReadyForAllServices: true,
      refetch: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useBalanceAndRefillRequirementsContext>);
    mockSleepAwareDelay.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('syncs enabledRef with enabled prop', () => {
    const params = makeHookParams({ enabled: true });
    const { result, rerender } = renderHook(
      (props) => useAutoRunSignals(props),
      { initialProps: params },
    );
    expect(result.current.enabledRef.current).toBe(true);

    rerender({ ...params, enabled: false });
    expect(result.current.enabledRef.current).toBe(false);
  });

  it('syncs runningAgentTypeRef with runningAgentType prop', () => {
    const params = makeHookParams({ runningAgentType: null });
    const { result, rerender } = renderHook(
      (props) => useAutoRunSignals(props),
      { initialProps: params },
    );
    expect(result.current.runningAgentTypeRef.current).toBeNull();

    rerender({ ...params, runningAgentType: AgentMap.PredictTrader });
    expect(result.current.runningAgentTypeRef.current).toBe(
      AgentMap.PredictTrader,
    );
  });

  it('updates reward snapshot when isEligibleForRewards changes', () => {
    const params = makeHookParams({
      selectedAgentType: AgentMap.PredictTrader,
      isEligibleForRewards: false,
    });
    const { result, rerender } = renderHook(
      (props) => useAutoRunSignals(props),
      { initialProps: params },
    );
    expect(
      result.current.rewardSnapshotRef.current[AgentMap.PredictTrader],
    ).toBe(false);

    rerender({ ...params, isEligibleForRewards: true });
    expect(
      result.current.rewardSnapshotRef.current[AgentMap.PredictTrader],
    ).toBe(true);
  });

  it('markRewardSnapshotPending sets snapshot to undefined', () => {
    const params = makeHookParams({ isEligibleForRewards: true });
    const { result } = renderHook(() => useAutoRunSignals(params));
    act(() => {
      result.current.markRewardSnapshotPending(AgentMap.PredictTrader);
    });
    expect(
      result.current.rewardSnapshotRef.current[AgentMap.PredictTrader],
    ).toBeUndefined();
  });

  it('getRewardSnapshot returns the stored value', () => {
    const params = makeHookParams({ isEligibleForRewards: true });
    const { result } = renderHook(() => useAutoRunSignals(params));
    expect(result.current.getRewardSnapshot(AgentMap.PredictTrader)).toBe(true);
  });

  it('setRewardSnapshot updates the snapshot', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunSignals(params));
    act(() => {
      result.current.setRewardSnapshot(AgentMap.PredictTrader, false);
    });
    expect(result.current.getRewardSnapshot(AgentMap.PredictTrader)).toBe(
      false,
    );
  });

  it('getBalancesStatus returns ready/loading from context', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunSignals(params));
    expect(result.current.getBalancesStatus()).toEqual({
      ready: true,
      loading: false,
    });
  });

  describe('scheduleNextScan', () => {
    it('increments scanTick after delay', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));
      const initialTick = result.current.scanTick;

      act(() => {
        result.current.scheduleNextScan(10);
      });
      expect(result.current.hasScheduledScan()).toBe(true);

      act(() => {
        jest.advanceTimersByTime(10_000);
      });
      expect(result.current.scanTick).toBe(initialTick + 1);
      expect(result.current.hasScheduledScan()).toBe(false);
    });

    it('does not schedule when disabled', () => {
      const params = makeHookParams({ enabled: false });
      const { result } = renderHook(() => useAutoRunSignals(params));

      act(() => {
        result.current.scheduleNextScan(10);
      });
      expect(result.current.hasScheduledScan()).toBe(false);
    });

    it('replaces previous scheduled scan', () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));
      const initialTick = result.current.scanTick;

      act(() => {
        result.current.scheduleNextScan(100);
      });
      act(() => {
        result.current.scheduleNextScan(5);
      });

      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(result.current.scanTick).toBe(initialTick + 1);
    });

    it('clears scheduled scan on disable', () => {
      const params = makeHookParams({ enabled: true });
      const { result, rerender } = renderHook(
        (props) => useAutoRunSignals(props),
        { initialProps: params },
      );

      act(() => {
        result.current.scheduleNextScan(100);
      });
      expect(result.current.hasScheduledScan()).toBe(true);

      rerender({ ...params, enabled: false });
      expect(result.current.hasScheduledScan()).toBe(false);
    });
  });

  describe('waitForAgentSelection', () => {
    it('returns true immediately when agent is already selected', async () => {
      const params = makeHookParams({
        selectedAgentType: AgentMap.PredictTrader,
        isSelectedAgentDetailsLoading: false,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForAgentSelection(
          AgentMap.PredictTrader,
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(ok).toBe(true);
    });

    it('returns false when disabled', async () => {
      const params = makeHookParams({ enabled: false });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForAgentSelection(AgentMap.PredictTrader);
      });
      expect(ok).toBe(false);
    });

    it('logs timeout message with agentType when selection wait times out', async () => {
      const logMessage = jest.fn();
      const params = makeHookParams({
        selectedAgentType: AgentMap.Optimus,
        isSelectedAgentDetailsLoading: true,
        logMessage,
      });
      // Advance past the timeout on each sleepAwareDelay call
      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(
          AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000 + 1,
        );
        return true;
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForAgentSelection(AgentMap.PredictTrader);
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith(
        `selection wait timeout: ${AgentMap.PredictTrader}`,
      );
    });

    it('logs timeout message with serviceConfigId when provided', async () => {
      const logMessage = jest.fn();
      const params = makeHookParams({
        selectedAgentType: AgentMap.Optimus,
        isSelectedAgentDetailsLoading: true,
        logMessage,
      });
      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(
          AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000 + 1,
        );
        return true;
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForAgentSelection(
          AgentMap.PredictTrader,
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith(
        `selection wait timeout: ${AgentMap.PredictTrader} (${DEFAULT_SERVICE_CONFIG_ID})`,
      );
    });
  });

  describe('waitForBalancesReady', () => {
    it('returns true immediately when balances are ready and fresh', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(true);
    });

    it('triggers refetch and logs when balances are stale', async () => {
      const logMessage = jest.fn();
      const refetchMock = jest.fn().mockResolvedValue(undefined);
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: false,
        isBalancesAndFundingRequirementsReadyForAllServices: true,
        refetch: refetchMock,
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      const params = makeHookParams({ logMessage });
      const { result } = renderHook(() => useAutoRunSignals(params));

      // Advance time past staleness threshold so isFresh() returns false
      jest.advanceTimersByTime(BALANCE_STALENESS_MS + 1);

      // Make sleepAwareDelay resolve then simulate balances becoming fresh
      let callCount = 0;
      mockSleepAwareDelay.mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          // Simulate balances becoming fresh on the next iteration
          // by not advancing time further — the refetch mock already updates
          // balanceLastUpdatedRef via the .then() handler
        }
        return true;
      });

      // waitForBalancesReady will see stale data, call refetch, then loop
      // The refetch resolves immediately, updating balanceLastUpdatedRef
      // But the while loop checks balancesReadyRef which is already true,
      // and isFresh() which needs balanceLastUpdatedRef to be recent.
      // Since refetch().then() updates balanceLastUpdatedRef to Date.now(),
      // and we're using fake timers, Date.now() is deterministic.
      // After refetch resolves, the next loop iteration should see fresh data.

      // We need to make the while loop see fresh data after refetch
      // The refetch .then() sets balanceLastUpdatedRef.current = Date.now()
      // Since the refetch mock resolves immediately, this happens before sleepAwareDelay

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });

      expect(logMessage).toHaveBeenCalledWith(
        'balances stale, triggering refetch',
      );
      expect(refetchMock).toHaveBeenCalled();
    });

    it('logs error when refetch fails', async () => {
      const logMessage = jest.fn();
      const refetchError = new Error('network failure');
      const refetchMock = jest.fn().mockRejectedValue(refetchError);
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: false,
        isBalancesAndFundingRequirementsReadyForAllServices: true,
        refetch: refetchMock,
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      const params = makeHookParams({ logMessage });
      const { result } = renderHook(() => useAutoRunSignals(params));

      // Advance time past staleness threshold
      jest.advanceTimersByTime(BALANCE_STALENESS_MS + 1);

      // After refetch rejects, the loop will continue. Let it timeout.
      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(BALANCES_WAIT_TIMEOUT_SECONDS * 1000 + 1);
        return true;
      });

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith(
        `balances refetch failed: ${refetchError}`,
      );
    });

    it('returns false when balances wait times out', async () => {
      const logMessage = jest.fn();
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: true,
        isBalancesAndFundingRequirementsReadyForAllServices: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      const params = makeHookParams({ logMessage });
      const { result } = renderHook(() => useAutoRunSignals(params));

      // Advance past timeout on first sleepAwareDelay call
      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(BALANCES_WAIT_TIMEOUT_SECONDS * 1000 + 1);
        return true;
      });

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith('balances wait timeout');
    });

    it('returns false when sleepAwareDelay returns false', async () => {
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: true,
        isBalancesAndFundingRequirementsReadyForAllServices: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      mockSleepAwareDelay.mockResolvedValue(false);
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(false);
    });
  });

  describe('waitForRewardsEligibility', () => {
    it('returns snapshot value immediately when populated', async () => {
      const params = makeHookParams({ isEligibleForRewards: true });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let value: boolean | undefined;
      await act(async () => {
        value = await result.current.waitForRewardsEligibility(
          AgentMap.PredictTrader,
        );
      });
      expect(value).toBe(true);
    });

    it('returns false snapshot when populated with false', async () => {
      const params = makeHookParams({ isEligibleForRewards: false });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let value: boolean | undefined;
      await act(async () => {
        value = await result.current.waitForRewardsEligibility(
          AgentMap.PredictTrader,
        );
      });
      expect(value).toBe(false);
    });

    it('returns undefined and logs timeout when snapshot stays undefined', async () => {
      const logMessage = jest.fn();
      const params = makeHookParams({
        isEligibleForRewards: undefined,
        logMessage,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      // Mark snapshot as pending so it stays undefined
      act(() => {
        result.current.markRewardSnapshotPending(AgentMap.PredictTrader);
      });

      // Advance past timeout on each sleepAwareDelay call
      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(REWARDS_WAIT_TIMEOUT_SECONDS * 1000 + 1);
        return true;
      });

      let value: boolean | undefined;
      await act(async () => {
        value = await result.current.waitForRewardsEligibility(
          AgentMap.PredictTrader,
        );
      });
      expect(value).toBeUndefined();
      expect(logMessage).toHaveBeenCalledWith(
        `rewards eligibility timeout: ${AgentMap.PredictTrader}, proceeding without it`,
      );
    });

    it('returns undefined when sleepAwareDelay returns false', async () => {
      const params = makeHookParams({ isEligibleForRewards: undefined });
      const { result } = renderHook(() => useAutoRunSignals(params));

      // Mark snapshot as pending
      act(() => {
        result.current.markRewardSnapshotPending(AgentMap.PredictTrader);
      });

      mockSleepAwareDelay.mockResolvedValue(false);

      let value: boolean | undefined;
      await act(async () => {
        value = await result.current.waitForRewardsEligibility(
          AgentMap.PredictTrader,
        );
      });
      expect(value).toBeUndefined();
    });
  });

  describe('waitForRunningAgent', () => {
    it('returns true when agent matches immediately', async () => {
      const params = makeHookParams({
        runningAgentType: AgentMap.PredictTrader,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningAgent(
          AgentMap.PredictTrader,
          10,
        );
      });
      expect(ok).toBe(true);
    });

    it('returns false when sleep/wake interrupts', async () => {
      mockSleepAwareDelay.mockResolvedValue(false);
      const params = makeHookParams({ runningAgentType: null });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningAgent(
          AgentMap.PredictTrader,
          10,
        );
      });
      expect(ok).toBe(false);
    });
  });
});
