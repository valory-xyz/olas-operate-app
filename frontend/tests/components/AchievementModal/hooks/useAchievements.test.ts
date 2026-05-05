import { renderHook } from '@testing-library/react';

import { useAchievements } from '../../../../components/AchievementModal/hooks/useAchievements';
import { FIVE_MINUTE_INTERVAL, REACT_QUERY_KEYS } from '../../../../constants';
import { getServiceAchievements } from '../../../../service/Achievement';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makePolystratPayoutAchievement,
} from '../../../helpers/factories';

// The source imports useAgentRunning from '@/hooks' (barrel).
// Mock the barrel to provide useAgentRunning.
const mockUseAgentRunning = jest.fn();
jest.mock('../../../../hooks', () => ({
  useAgentRunning: (...args: unknown[]) => mockUseAgentRunning(...args),
}));
// Also mock direct path in case other modules resolve it
jest.mock('../../../../hooks/useAgentRunning', () => ({
  useAgentRunning: (...args: unknown[]) => mockUseAgentRunning(...args),
}));

jest.mock('../../../../service/Achievement', () => ({
  getServiceAchievements: jest.fn(),
}));

const mockGetServiceAchievements =
  getServiceAchievements as jest.MockedFunction<typeof getServiceAchievements>;

const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// Strip serviceConfigId — the hook adds it during mapping
const { serviceConfigId: _, ...sampleAchievement } =
  makePolystratPayoutAchievement();

describe('useAchievements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentRunning.mockReturnValue({
      runningServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    });
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
    });
  });

  it('passes correct query key with runningServiceConfigId', () => {
    renderHook(() => useAchievements());

    const queryConfig = mockUseQuery.mock.calls[0][0];
    expect(queryConfig.queryKey).toEqual(
      REACT_QUERY_KEYS.ACHIEVEMENTS_KEY(DEFAULT_SERVICE_CONFIG_ID),
    );
  });

  it('enables query only when runningServiceConfigId is truthy', () => {
    renderHook(() => useAchievements());
    const queryConfig = mockUseQuery.mock.calls[0][0];
    expect(queryConfig.enabled).toBe(true);

    mockUseAgentRunning.mockReturnValue({ runningServiceConfigId: null });
    renderHook(() => useAchievements());
    const queryConfig2 = mockUseQuery.mock.calls[1][0];
    expect(queryConfig2.enabled).toBe(false);
  });

  it('sets refetchInterval to FIVE_MINUTE_INTERVAL', () => {
    renderHook(() => useAchievements());
    const queryConfig = mockUseQuery.mock.calls[0][0];
    expect(queryConfig.refetchInterval).toBe(FIVE_MINUTE_INTERVAL);
  });

  it('queryFn returns empty array when no runningServiceConfigId', async () => {
    mockUseAgentRunning.mockReturnValue({ runningServiceConfigId: null });
    renderHook(() => useAchievements());

    const queryConfig = mockUseQuery.mock.calls[0][0];
    const result = await queryConfig.queryFn({
      signal: new AbortController().signal,
    });
    expect(result).toEqual([]);
  });

  it('queryFn maps achievements with serviceConfigId', async () => {
    mockGetServiceAchievements.mockResolvedValue([sampleAchievement]);
    renderHook(() => useAchievements());

    const queryConfig = mockUseQuery.mock.calls[0][0];
    const result = await queryConfig.queryFn({
      signal: new AbortController().signal,
    });

    expect(result).toEqual([
      { ...sampleAchievement, serviceConfigId: DEFAULT_SERVICE_CONFIG_ID },
    ]);
  });

  it('returns achievements, isLoading, and isError from query', () => {
    const achievementsWithConfigId = [
      { ...sampleAchievement, serviceConfigId: DEFAULT_SERVICE_CONFIG_ID },
    ];
    mockUseQuery.mockReturnValue({
      data: achievementsWithConfigId,
      isLoading: false,
      error: null,
      isError: false,
    });

    const { result } = renderHook(() => useAchievements());
    expect(result.current.achievements).toEqual(achievementsWithConfigId);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('logs error when query fails', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const queryError = new Error('Fetch failed');
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: queryError,
      isError: true,
    });

    renderHook(() => useAchievements());

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to fetch achievements:',
      queryError,
    );
    consoleSpy.mockRestore();
  });
});
