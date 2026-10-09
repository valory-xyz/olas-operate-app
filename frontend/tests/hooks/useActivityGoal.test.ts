import { renderHook, waitFor } from '@testing-library/react';

import { MiddlewareChainMap } from '../../constants/chains';
import { useActivityGoal } from '../../hooks/useActivityGoal';
import { ServicesService } from '../../service/Services';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeActivityGoal,
  makeService,
} from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({ PROVIDERS: {} }));

const mockUseServices = jest.fn();
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

jest.mock('../../service/Services', () => ({
  ServicesService: { getAgentPerformance: jest.fn() },
}));

const mockGetAgentPerformance =
  ServicesService.getAgentPerformance as jest.Mock;

const makePerformance = (activityGoal?: unknown) => ({
  timestamp: null,
  metrics: [],
  last_activity: null,
  agent_behavior: null,
  ...(activityGoal === undefined ? {} : { activity_goal: activityGoal }),
});

describe('useActivityGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      services: [
        makeService({
          service_config_id: DEFAULT_SERVICE_CONFIG_ID,
          home_chain: MiddlewareChainMap.GNOSIS,
        }),
      ],
    });
  });

  it('returns the parsed block for the instance', async () => {
    const goal = makeActivityGoal();
    mockGetAgentPerformance.mockResolvedValue(makePerformance(goal));

    const { result } = renderHook(
      () => useActivityGoal(DEFAULT_SERVICE_CONFIG_ID),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activityGoal).toEqual(goal);
    expect(result.current.isUnavailable).toBe(false);
    expect(mockGetAgentPerformance).toHaveBeenCalledWith({
      serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    });
  });

  it('is loading with no block before the report arrives', () => {
    mockGetAgentPerformance.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useActivityGoal(DEFAULT_SERVICE_CONFIG_ID),
      { wrapper: createQueryClientWrapper() },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.activityGoal).toBeNull();
  });

  it('returns null when an older agent build omits the block', async () => {
    mockGetAgentPerformance.mockResolvedValue(makePerformance());

    const { result } = renderHook(
      () => useActivityGoal(DEFAULT_SERVICE_CONFIG_ID),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activityGoal).toBeNull();
    expect(result.current.isUnavailable).toBe(false);
  });

  it('returns null when the block is malformed', async () => {
    mockGetAgentPerformance.mockResolvedValue(
      makePerformance({ target: 'eight' }),
    );

    const { result } = renderHook(
      () => useActivityGoal(DEFAULT_SERVICE_CONFIG_ID),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activityGoal).toBeNull();
  });

  it('flags the report as unavailable when the fetch fails', async () => {
    mockGetAgentPerformance.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(
      () => useActivityGoal(DEFAULT_SERVICE_CONFIG_ID),
      { wrapper: createQueryClientWrapper() },
    );

    await waitFor(() => expect(result.current.isUnavailable).toBe(true));
    expect(result.current.activityGoal).toBeNull();
  });

  it('does not fetch for an unknown instance', () => {
    const { result } = renderHook(() => useActivityGoal('sc-unknown'), {
      wrapper: createQueryClientWrapper(),
    });

    expect(mockGetAgentPerformance).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.activityGoal).toBeNull();
  });
});
