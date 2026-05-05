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
  runningServiceConfigId: null as string | null,
  isSelectedAgentDetailsLoading: false,
  isEligibleForRewards: undefined as boolean | undefined,
  isEpochExpired: false,
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

  it('syncs runningServiceConfigIdRef with runningServiceConfigId prop', () => {
    const params = makeHookParams({ runningServiceConfigId: null });
    const { result, rerender } = renderHook(
      (props) => useAutoRunSignals(props),
      { initialProps: params },
    );
    expect(result.current.runningServiceConfigIdRef.current).toBeNull();

    rerender({
      ...params,
      runningServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    });
    expect(result.current.runningServiceConfigIdRef.current).toBe(
      DEFAULT_SERVICE_CONFIG_ID,
    );
  });

  it('updates reward snapshot when isEligibleForRewards changes', () => {
    const params = makeHookParams({
      selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      isEligibleForRewards: false,
    });
    const { result, rerender } = renderHook(
      (props) => useAutoRunSignals(props),
      { initialProps: params },
    );
    expect(
      result.current.rewardSnapshotRef.current[DEFAULT_SERVICE_CONFIG_ID],
    ).toBe(false);

    rerender({ ...params, isEligibleForRewards: true });
    expect(
      result.current.rewardSnapshotRef.current[DEFAULT_SERVICE_CONFIG_ID],
    ).toBe(true);
  });

  it('markRewardSnapshotPending sets snapshot to undefined', () => {
    const params = makeHookParams({ isEligibleForRewards: true });
    const { result } = renderHook(() => useAutoRunSignals(params));
    act(() => {
      result.current.markRewardSnapshotPending(DEFAULT_SERVICE_CONFIG_ID);
    });
    expect(
      result.current.rewardSnapshotRef.current[DEFAULT_SERVICE_CONFIG_ID],
    ).toBeUndefined();
  });

  it('getRewardSnapshot returns the stored value', () => {
    const params = makeHookParams({ isEligibleForRewards: true });
    const { result } = renderHook(() => useAutoRunSignals(params));
    expect(result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID)).toBe(
      true,
    );
  });

  it('setRewardSnapshot updates the snapshot', () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunSignals(params));
    act(() => {
      result.current.setRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID, false);
    });
    expect(result.current.getRewardSnapshot(DEFAULT_SERVICE_CONFIG_ID)).toBe(
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

  describe('waitForInstanceSelection', () => {
    it('returns true immediately when instance is already selected', async () => {
      const params = makeHookParams({
        selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        isSelectedAgentDetailsLoading: false,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForInstanceSelection(
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
        ok = await result.current.waitForInstanceSelection(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(ok).toBe(false);
    });

    it('logs timeout message with serviceConfigId when selection wait times out', async () => {
      const logMessage = jest.fn();
      const params = makeHookParams({
        selectedServiceConfigId: 'sc-other',
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
        ok = await result.current.waitForInstanceSelection(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith(
        `selection wait timeout: ${DEFAULT_SERVICE_CONFIG_ID}`,
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

      jest.advanceTimersByTime(BALANCE_STALENESS_MS + 1);

      let callCount = 0;
      mockSleepAwareDelay.mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          // Simulate balances becoming fresh on the next iteration
        }
        return true;
      });

      await act(async () => {
        await result.current.waitForBalancesReady();
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

      jest.advanceTimersByTime(BALANCE_STALENESS_MS + 1);

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
          DEFAULT_SERVICE_CONFIG_ID,
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
          DEFAULT_SERVICE_CONFIG_ID,
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

      act(() => {
        result.current.markRewardSnapshotPending(DEFAULT_SERVICE_CONFIG_ID);
      });

      mockSleepAwareDelay.mockImplementation(async () => {
        jest.advanceTimersByTime(REWARDS_WAIT_TIMEOUT_SECONDS * 1000 + 1);
        return true;
      });

      let value: boolean | undefined;
      await act(async () => {
        value = await result.current.waitForRewardsEligibility(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(value).toBeUndefined();
      expect(logMessage).toHaveBeenCalledWith(
        `rewards eligibility timeout: ${DEFAULT_SERVICE_CONFIG_ID}, proceeding without it`,
      );
    });

    it('returns undefined when sleepAwareDelay returns false', async () => {
      const params = makeHookParams({ isEligibleForRewards: undefined });
      const { result } = renderHook(() => useAutoRunSignals(params));

      act(() => {
        result.current.markRewardSnapshotPending(DEFAULT_SERVICE_CONFIG_ID);
      });

      mockSleepAwareDelay.mockResolvedValue(false);

      let value: boolean | undefined;
      await act(async () => {
        value = await result.current.waitForRewardsEligibility(
          DEFAULT_SERVICE_CONFIG_ID,
        );
      });
      expect(value).toBeUndefined();
    });
  });

  describe('waitForRunningInstance', () => {
    it('returns true when instance matches immediately', async () => {
      const params = makeHookParams({
        runningServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(true);
    });

    it('returns false when sleep/wake interrupts', async () => {
      mockSleepAwareDelay.mockResolvedValue(false);
      const params = makeHookParams({ runningServiceConfigId: null });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(false);
    });

    it('returns false and logs timeout when instance never matches', async () => {
      const logMessage = jest.fn();
      const params = makeHookParams({
        runningServiceConfigId: null,
        logMessage,
      });
      const realDateNow = Date.now;
      let elapsed = 0;
      Date.now = jest.fn(() => {
        elapsed += 11_000;
        return realDateNow() + elapsed;
      });

      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForRunningInstance(
          DEFAULT_SERVICE_CONFIG_ID,
          10,
        );
      });
      expect(ok).toBe(false);
      expect(logMessage).toHaveBeenCalledWith(
        `running timeout: ${DEFAULT_SERVICE_CONFIG_ID}`,
      );
      Date.now = realDateNow;
    });
  });

  describe('waitForBalancesReady — disabled mid-wait', () => {
    it('returns false when disabled while waiting for balances', async () => {
      mockUseBalanceContext.mockReturnValue({
        isBalancesAndFundingRequirementsLoadingForAllServices: true,
        isBalancesAndFundingRequirementsReadyForAllServices: false,
        refetch: jest.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<
        typeof useBalanceAndRefillRequirementsContext
      >);

      const params = makeHookParams({ enabled: false });
      const { result } = renderHook(() => useAutoRunSignals(params));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.waitForBalancesReady();
      });
      expect(ok).toBe(false);
    });
  });

  describe('unmount cleanup', () => {
    it('clears pending scan timer on unmount', () => {
      const params = makeHookParams();
      const { result, unmount } = renderHook(() => useAutoRunSignals(params));

      act(() => {
        result.current.scheduleNextScan(100);
      });
      expect(result.current.hasScheduledScan()).toBe(true);

      unmount();
    });
  });

  describe('isEpochExpired override', () => {
    it('overrides isEligibleForRewards to false when epoch is expired', () => {
      const params = makeHookParams({
        selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        isEligibleForRewards: true,
        isEpochExpired: true,
      });
      const { result } = renderHook(() => useAutoRunSignals(params));
      expect(
        result.current.rewardSnapshotRef.current[DEFAULT_SERVICE_CONFIG_ID],
      ).toBe(false);
    });
  });
});
