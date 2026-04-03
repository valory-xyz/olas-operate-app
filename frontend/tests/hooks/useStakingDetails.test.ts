import { renderHook } from '@testing-library/react';

import { useBalanceContext } from '../../hooks/useBalanceContext';
import { useRewardContext } from '../../hooks/useRewardContext';
import { useRewardsHistory } from '../../hooks/useRewardsHistory';
import { useStakingDetails } from '../../hooks/useStakingDetails';

jest.mock('../../hooks/useBalanceContext', () => ({
  useBalanceContext: jest.fn(),
}));

jest.mock('../../hooks/useRewardContext', () => ({
  useRewardContext: jest.fn(),
}));

jest.mock('../../hooks/useRewardsHistory', () => ({
  useRewardsHistory: jest.fn(),
}));

const mockUseBalanceContext = useBalanceContext as jest.Mock;
const mockUseRewardContext = useRewardContext as jest.Mock;
const mockUseRewardsHistory = useRewardsHistory as jest.Mock;

const makeBigNumberLike = (value: number) => ({
  _isBigNumber: true,
  _hex: `0x${value.toString(16)}`,
});

const setupMocks = ({
  isBalanceLoading = false,
  isEligibleForRewards = false,
  stakingRewardsDetails = null as Record<string, unknown> | null,
  isStakingRewardsDetailsLoading = false,
  latestRewardStreak = 0,
  isRewardsHistoryLoading = false,
  isError = false,
}: {
  isBalanceLoading?: boolean;
  isEligibleForRewards?: boolean;
  stakingRewardsDetails?: Record<string, unknown> | null;
  isStakingRewardsDetailsLoading?: boolean;
  latestRewardStreak?: number;
  isRewardsHistoryLoading?: boolean;
  isError?: boolean;
} = {}) => {
  mockUseBalanceContext.mockReturnValue({ isLoading: isBalanceLoading });
  mockUseRewardContext.mockReturnValue({
    isEligibleForRewards,
    stakingRewardsDetails,
    isStakingRewardsDetailsLoading,
  });
  mockUseRewardsHistory.mockReturnValue({
    latestRewardStreak,
    isLoading: isRewardsHistoryLoading,
    isError,
  });
};

describe('useStakingDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('optimisticStreak', () => {
    it('returns streak + 1 when eligible for rewards', () => {
      setupMocks({ isEligibleForRewards: true, latestRewardStreak: 5 });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.optimisticStreak).toBe(6);
    });

    it('returns streak unchanged when not eligible for rewards', () => {
      setupMocks({ isEligibleForRewards: false, latestRewardStreak: 5 });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.optimisticStreak).toBe(5);
    });

    it('returns 1 when eligible with zero streak', () => {
      setupMocks({ isEligibleForRewards: true, latestRewardStreak: 0 });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.optimisticStreak).toBe(1);
    });

    it('returns 0 when not eligible with zero streak', () => {
      setupMocks({ isEligibleForRewards: false, latestRewardStreak: 0 });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.optimisticStreak).toBe(0);
    });
  });

  describe('currentEpochLifetime', () => {
    it('calculates (tsCheckpoint + livenessPeriod) * 1000 when data is available', () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const livenessPeriod = 43200;
      const tsCheckpoint = nowInSeconds - 60;
      setupMocks({
        stakingRewardsDetails: {
          tsCheckpoint,
          livenessPeriod: makeBigNumberLike(livenessPeriod),
        },
        isStakingRewardsDetailsLoading: false,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.currentEpochLifetime).toBe(
        (tsCheckpoint + livenessPeriod) * 1000,
      );
    });

    it('returns undefined when stakingRewardsDetails is null', () => {
      setupMocks({
        stakingRewardsDetails: null,
        isStakingRewardsDetailsLoading: false,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.currentEpochLifetime).toBeUndefined();
    });

    it('returns undefined when isStakingRewardsDetailsLoading is true', () => {
      setupMocks({
        stakingRewardsDetails: {
          tsCheckpoint: 1700000000,
          livenessPeriod: makeBigNumberLike(86400),
        },
        isStakingRewardsDetailsLoading: true,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.currentEpochLifetime).toBeUndefined();
    });

    it('returns undefined when tsCheckpoint is 0 (falsy)', () => {
      setupMocks({
        stakingRewardsDetails: {
          tsCheckpoint: 0,
          livenessPeriod: makeBigNumberLike(86400),
        },
        isStakingRewardsDetailsLoading: false,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.currentEpochLifetime).toBeUndefined();
    });

    it('returns undefined when tsCheckpoint is undefined', () => {
      setupMocks({
        stakingRewardsDetails: { livenessPeriod: makeBigNumberLike(86400) },
        isStakingRewardsDetailsLoading: false,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.currentEpochLifetime).toBeUndefined();
    });

    it('returns undefined when livenessPeriod is missing', () => {
      setupMocks({
        stakingRewardsDetails: { tsCheckpoint: 1700000000 },
        isStakingRewardsDetailsLoading: false,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.currentEpochLifetime).toBeUndefined();
    });

    it('returns undefined when the epoch has already expired', () => {
      const tsCheckpoint = 1700000000;
      const livenessPeriod = 60;
      const dateNowSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValue((tsCheckpoint + livenessPeriod + 1) * 1000);

      setupMocks({
        stakingRewardsDetails: {
          tsCheckpoint,
          livenessPeriod: makeBigNumberLike(livenessPeriod),
        },
        isStakingRewardsDetailsLoading: false,
      });

      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.currentEpochLifetime).toBeUndefined();

      dateNowSpy.mockRestore();
    });
  });

  describe('isStreakLoading', () => {
    it('returns true when balance is loading', () => {
      setupMocks({
        isBalanceLoading: true,
        isRewardsHistoryLoading: false,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.isStreakLoading).toBe(true);
    });

    it('returns true when rewards history is loading', () => {
      setupMocks({
        isBalanceLoading: false,
        isRewardsHistoryLoading: true,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.isStreakLoading).toBe(true);
    });

    it('returns true when both are loading', () => {
      setupMocks({
        isBalanceLoading: true,
        isRewardsHistoryLoading: true,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.isStreakLoading).toBe(true);
    });

    it('returns false when neither is loading', () => {
      setupMocks({
        isBalanceLoading: false,
        isRewardsHistoryLoading: false,
      });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.isStreakLoading).toBe(false);
    });
  });

  describe('isStreakError', () => {
    it('returns true when useRewardsHistory has an error', () => {
      setupMocks({ isError: true });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.isStreakError).toBe(true);
    });

    it('returns false when useRewardsHistory has no error', () => {
      setupMocks({ isError: false });
      const { result } = renderHook(() => useStakingDetails());
      expect(result.current.isStreakError).toBe(false);
    });
  });
});
