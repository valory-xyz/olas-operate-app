import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';

import { useAchievements } from '../../../../components/AchievementModal/hooks/useAchievements';
import { useCurrentAchievement } from '../../../../components/AchievementModal/hooks/useCurrentAchievement';
import { ONE_MINUTE_IN_MS } from '../../../../utils';
import { makePolystratPayoutAchievement } from '../../../helpers/factories';

jest.mock('ethers-multicall', () => ({ Contract: jest.fn() }));
jest.mock('../../../../constants/providers', () => ({}));
jest.mock('../../../../config/providers', () => ({ providers: [] }));

jest.mock(
  '../../../../components/AchievementModal/hooks/useAchievements',
  () => ({ useAchievements: jest.fn() }),
);
// Capture the cleanup function passed to useUnmount so we can invoke it
let capturedUnmountFn: (() => void) | null = null;
jest.mock('usehooks-ts', () => ({
  useUnmount: jest.fn((fn: () => void) => {
    capturedUnmountFn = fn;
  }),
}));

const mockUseAchievements = useAchievements as jest.MockedFunction<
  typeof useAchievements
>;

const makeAchievement = (id: string) =>
  makePolystratPayoutAchievement({ achievement_id: id });

describe('useCurrentAchievement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedUnmountFn = null;
    mockUseAchievements.mockReturnValue({
      achievements: [],
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null currentAchievement when no achievements', () => {
    const { result } = renderHook(() => useCurrentAchievement());
    expect(result.current.currentAchievement).toBeNull();
  });

  it('auto-shows the first unshown achievement', async () => {
    const ach1 = makeAchievement('ach-1');
    mockUseAchievements.mockReturnValue({
      achievements: [ach1],
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useCurrentAchievement());

    await waitFor(() => {
      expect(result.current.currentAchievement).toEqual(ach1);
    });
  });

  it('markCurrentAchievementAsShown clears after ONE_MINUTE_IN_MS', async () => {
    const ach1 = makeAchievement('ach-1');
    mockUseAchievements.mockReturnValue({
      achievements: [ach1],
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useCurrentAchievement());

    await waitFor(() => {
      expect(result.current.currentAchievement).not.toBeNull();
    });

    act(() => {
      result.current.markCurrentAchievementAsShown();
    });

    // Not cleared yet
    expect(result.current.currentAchievement).toEqual(ach1);

    // Advance to just before timeout
    act(() => {
      jest.advanceTimersByTime(ONE_MINUTE_IN_MS - 1);
    });
    expect(result.current.currentAchievement).toEqual(ach1);

    // Advance past timeout
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.currentAchievement).toBeNull();
  });

  it('cycles to next achievement after current is marked as shown', async () => {
    const ach1 = makeAchievement('ach-1');
    const ach2 = makeAchievement('ach-2');
    mockUseAchievements.mockReturnValue({
      achievements: [ach1, ach2],
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useCurrentAchievement());

    // First achievement shown
    await waitFor(() => {
      expect(result.current.currentAchievement?.achievement_id).toBe('ach-1');
    });

    // Mark as shown
    act(() => {
      result.current.markCurrentAchievementAsShown();
    });

    // Advance timer to complete the mark
    act(() => {
      jest.advanceTimersByTime(ONE_MINUTE_IN_MS);
    });

    // Second achievement should be shown
    await waitFor(() => {
      expect(result.current.currentAchievement?.achievement_id).toBe('ach-2');
    });
  });

  it('does not show already-shown achievements again', async () => {
    const ach1 = makeAchievement('ach-1');
    mockUseAchievements.mockReturnValue({
      achievements: [ach1],
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useCurrentAchievement());

    await waitFor(() => {
      expect(result.current.currentAchievement).not.toBeNull();
    });

    // Mark as shown and advance timer
    act(() => {
      result.current.markCurrentAchievementAsShown();
    });
    act(() => {
      jest.advanceTimersByTime(ONE_MINUTE_IN_MS);
    });

    // No more unshown achievements
    expect(result.current.currentAchievement).toBeNull();
  });

  it('does nothing when markCurrentAchievementAsShown called with no current', () => {
    const { result } = renderHook(() => useCurrentAchievement());
    // Should not throw
    act(() => {
      result.current.markCurrentAchievementAsShown();
    });
    expect(result.current.currentAchievement).toBeNull();
  });

  it('clears previous timeout when markCurrentAchievementAsShown called again', async () => {
    const ach1 = makeAchievement('ach-1');
    mockUseAchievements.mockReturnValue({
      achievements: [ach1],
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useCurrentAchievement());

    await waitFor(() => {
      expect(result.current.currentAchievement).not.toBeNull();
    });

    // Call markCurrentAchievementAsShown twice
    act(() => {
      result.current.markCurrentAchievementAsShown();
    });
    // Advance halfway
    act(() => {
      jest.advanceTimersByTime(ONE_MINUTE_IN_MS / 2);
    });
    // Call again — should clear the first timeout
    act(() => {
      result.current.markCurrentAchievementAsShown();
    });

    // Advance the remaining time from the first call — should NOT trigger
    act(() => {
      jest.advanceTimersByTime(ONE_MINUTE_IN_MS / 2);
    });
    expect(result.current.currentAchievement).toEqual(ach1);

    // Now advance the full timeout from the second call
    act(() => {
      jest.advanceTimersByTime(ONE_MINUTE_IN_MS / 2);
    });
    expect(result.current.currentAchievement).toBeNull();
  });

  it('clears pending timeout on unmount via useUnmount', async () => {
    const ach1 = makeAchievement('ach-1');
    mockUseAchievements.mockReturnValue({
      achievements: [ach1],
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useCurrentAchievement());

    await waitFor(() => {
      expect(result.current.currentAchievement).not.toBeNull();
    });

    // Start a timeout by marking as shown
    act(() => {
      result.current.markCurrentAchievementAsShown();
    });

    // The timeout is now pending — invoke the captured unmount cleanup
    expect(capturedUnmountFn).not.toBeNull();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    act(() => {
      capturedUnmountFn!();
    });

    // useUnmount cleanup should have called clearTimeout
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('passes through isLoading and isError from useAchievements', () => {
    mockUseAchievements.mockReturnValue({
      achievements: [],
      isLoading: true,
      isError: true,
    });

    const { result } = renderHook(() => useCurrentAchievement());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(true);
  });
});
