import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { STAKING_PROGRAM_IDS } from '../../../../constants/stakingProgram';
import {
  AUTO_RUN_HEALTH_METRIC,
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  REWARDS_POLL_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import {
  formatEligibilityReason,
  isOnlyLoadingReason,
  isStakingEpochExpired,
  normalizeEligibility,
  refreshRewardsEligibility,
  waitForEligibilityReadyHelper,
} from '../../../../context/AutoRunProvider/utils/autoRunHelpers';
import * as delayModule from '../../../../utils/delay';
import { fetchAgentStakingRewardsInfo } from '../../../../utils/stakingRewards';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAutoRunAgentMeta,
} from '../../../helpers/factories';

jest.mock('../../../../utils/stakingRewards', () => ({
  fetchAgentStakingRewardsInfo: jest.fn(),
}));

jest.mock('../../../../utils/delay', () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../helpers/autoRunMocks').delayMockFactory(),
);

const mockSleepAwareDelay = delayModule.sleepAwareDelay as jest.Mock;

const mockFetchRewards = fetchAgentStakingRewardsInfo as jest.MockedFunction<
  typeof fetchAgentStakingRewardsInfo
>;

describe('isStakingEpochExpired', () => {
  const makeArgs = (livenessPeriod: unknown, tsCheckpoint: number) =>
    ({ livenessPeriod, tsCheckpoint }) as Parameters<
      typeof isStakingEpochExpired
    >[0];

  it('returns false when livenessPeriod <= 0', () => {
    expect(isStakingEpochExpired(makeArgs(0, 0))).toBe(false);
    expect(isStakingEpochExpired(makeArgs(-1, 0))).toBe(false);
  });

  it('returns true when elapsed time >= livenessPeriod', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isStakingEpochExpired(makeArgs(100, now - 200))).toBe(true);
  });

  it('returns false when elapsed time < livenessPeriod', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isStakingEpochExpired(makeArgs(10000, now - 10))).toBe(false);
  });

  it('returns false (fail closed) when livenessPeriod is malformed', () => {
    expect(isStakingEpochExpired(makeArgs('not-a-number', 0))).toBe(false);
  });
});

describe('formatEligibilityReason', () => {
  it('formats Loading + sub-reason as "Loading: <sub>"', () => {
    expect(
      formatEligibilityReason({
        reason: ELIGIBILITY_REASON.LOADING,
        loadingReason: 'Balances',
      }),
    ).toBe('Loading: Balances');
  });

  it('returns reason directly when not Loading', () => {
    expect(formatEligibilityReason({ reason: 'Low balance' })).toBe(
      'Low balance',
    );
  });

  it('returns Loading without sub-reason when loadingReason is undefined', () => {
    expect(
      formatEligibilityReason({ reason: ELIGIBILITY_REASON.LOADING }),
    ).toBe(ELIGIBILITY_REASON.LOADING);
  });

  it('returns "unknown" when no reason provided', () => {
    expect(formatEligibilityReason({})).toBe('unknown');
  });
});

describe('isOnlyLoadingReason', () => {
  it('returns true when reason is Loading and only sub-reason matches', () => {
    expect(
      isOnlyLoadingReason(
        {
          reason: ELIGIBILITY_REASON.LOADING,
          loadingReason: ELIGIBILITY_LOADING_REASON.BALANCES,
        },
        ELIGIBILITY_LOADING_REASON.BALANCES,
      ),
    ).toBe(true);
  });

  it('returns false when reason is not Loading', () => {
    expect(
      isOnlyLoadingReason(
        { reason: 'Low balance', loadingReason: 'Balances' },
        'Balances',
      ),
    ).toBe(false);
  });

  it('returns false when multiple loading reasons present', () => {
    expect(
      isOnlyLoadingReason(
        { reason: ELIGIBILITY_REASON.LOADING, loadingReason: 'Balances, Safe' },
        'Balances',
      ),
    ).toBe(false);
  });

  it('returns false when loadingReason does not match target', () => {
    expect(
      isOnlyLoadingReason(
        { reason: ELIGIBILITY_REASON.LOADING, loadingReason: 'Safe' },
        ELIGIBILITY_LOADING_REASON.BALANCES,
      ),
    ).toBe(false);
  });

  it('returns false when loadingReason is undefined', () => {
    expect(
      isOnlyLoadingReason(
        { reason: ELIGIBILITY_REASON.LOADING },
        ELIGIBILITY_LOADING_REASON.BALANCES,
      ),
    ).toBe(false);
  });
});

describe('normalizeEligibility', () => {
  const balancesReady = () => ({ ready: true, loading: false });
  const balancesLoading = () => ({ ready: false, loading: true });
  const balancesNotReady = () => ({ ready: false, loading: false });

  it('converts "Another agent running" to transient Loading', () => {
    const result = normalizeEligibility(
      {
        canRun: false,
        reason: ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING,
      },
      balancesReady,
    );
    expect(result).toEqual({
      canRun: false,
      reason: ELIGIBILITY_REASON.LOADING,
      loadingReason: ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING,
    });
  });

  it('promotes stale "Loading: Balances" to canRun=true when balances are ready', () => {
    const result = normalizeEligibility(
      {
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
        loadingReason: ELIGIBILITY_LOADING_REASON.BALANCES,
      },
      balancesReady,
    );
    expect(result).toEqual({ canRun: true });
  });

  it('keeps "Loading: Balances" when balances are still loading', () => {
    const eligibility = {
      canRun: false,
      reason: ELIGIBILITY_REASON.LOADING,
      loadingReason: ELIGIBILITY_LOADING_REASON.BALANCES,
    };
    const result = normalizeEligibility(eligibility, balancesLoading);
    expect(result).toBe(eligibility);
  });

  it('keeps "Loading: Balances" when balances not ready and not loading', () => {
    const eligibility = {
      canRun: false,
      reason: ELIGIBILITY_REASON.LOADING,
      loadingReason: ELIGIBILITY_LOADING_REASON.BALANCES,
    };
    const result = normalizeEligibility(eligibility, balancesNotReady);
    expect(result).toBe(eligibility);
  });

  it('passes through non-Loading eligibility unchanged', () => {
    const eligibility = { canRun: false, reason: 'Low balance' };
    const result = normalizeEligibility(eligibility, balancesReady);
    expect(result).toBe(eligibility);
  });

  it('passes through canRun=true eligibility unchanged', () => {
    const eligibility = { canRun: true };
    const result = normalizeEligibility(eligibility, balancesReady);
    expect(result).toBe(eligibility);
  });

  it('does not promote Loading with multiple sub-reasons', () => {
    const eligibility = {
      canRun: false,
      reason: ELIGIBILITY_REASON.LOADING,
      loadingReason: 'Balances, Safe',
    };
    const result = normalizeEligibility(eligibility, balancesReady);
    expect(result).toBe(eligibility);
  });
});

describe('refreshRewardsEligibility', () => {
  const makeParams = (
    overrides: Partial<Parameters<typeof refreshRewardsEligibility>[0]> = {},
  ) => ({
    serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    configuredAgents: [
      makeAutoRunAgentMeta(
        AgentMap.PredictTrader,
        AGENT_CONFIG[AgentMap.PredictTrader],
      ),
    ],
    lastRewardsFetchRef: { current: {} },
    getRewardSnapshot: jest.fn().mockReturnValue(undefined),
    setRewardSnapshot: jest.fn(),
    logMessage: jest.fn(),
    onRewardsFetchError: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached snapshot when within throttle window', async () => {
    const getRewardSnapshot = jest.fn().mockReturnValue(true);
    const params = makeParams({
      lastRewardsFetchRef: {
        current: { [DEFAULT_SERVICE_CONFIG_ID]: Date.now() },
      },
      getRewardSnapshot,
    });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBe(true);
    expect(getRewardSnapshot).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
    expect(mockFetchRewards).not.toHaveBeenCalled();
  });

  it('returns undefined when agent not in configuredAgents', async () => {
    const params = makeParams({ configuredAgents: [] });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBeUndefined();
  });

  it('returns undefined when multisig is missing', async () => {
    const params = makeParams({
      configuredAgents: [
        {
          ...makeAutoRunAgentMeta(
            AgentMap.PredictTrader,
            AGENT_CONFIG[AgentMap.PredictTrader],
          ),
          multisig: undefined,
        },
      ],
    });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBeUndefined();
  });

  it('returns undefined when serviceNftTokenId is invalid (-1)', async () => {
    const params = makeParams({
      configuredAgents: [
        {
          ...makeAutoRunAgentMeta(
            AgentMap.PredictTrader,
            AGENT_CONFIG[AgentMap.PredictTrader],
          ),
          serviceNftTokenId: -1,
        },
      ],
    });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBeUndefined();
  });

  it('returns undefined when stakingProgramId is missing', async () => {
    const params = makeParams({
      configuredAgents: [
        {
          ...makeAutoRunAgentMeta(
            AgentMap.PredictTrader,
            AGENT_CONFIG[AgentMap.PredictTrader],
          ),
          stakingProgramId:
            '' as typeof STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3,
        },
      ],
    });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBeUndefined();
  });

  it('fetches and returns true when eligible', async () => {
    mockFetchRewards.mockResolvedValue({
      isEligibleForRewards: true,
    } as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
    const setRewardSnapshot = jest.fn();
    const params = makeParams({ setRewardSnapshot });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBe(true);
    expect(setRewardSnapshot).toHaveBeenCalledWith(
      DEFAULT_SERVICE_CONFIG_ID,
      true,
    );
  });

  it('fetches and returns false when not eligible', async () => {
    mockFetchRewards.mockResolvedValue({
      isEligibleForRewards: false,
    } as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
    const setRewardSnapshot = jest.fn();
    const params = makeParams({ setRewardSnapshot });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBe(false);
    expect(setRewardSnapshot).toHaveBeenCalledWith(
      DEFAULT_SERVICE_CONFIG_ID,
      false,
    );
  });

  it('calls onRewardsFetchError when onError callback fires', async () => {
    mockFetchRewards.mockImplementation(async ({ onError }) => {
      onError?.(new Error('RPC timeout'));
      return null as unknown as Awaited<
        ReturnType<typeof fetchAgentStakingRewardsInfo>
      >;
    });
    const onRewardsFetchError = jest.fn();
    const params = makeParams({ onRewardsFetchError });
    await refreshRewardsEligibility(params);
    expect(onRewardsFetchError).toHaveBeenCalled();
  });

  it('updates lastRewardsFetchRef timestamp after fetch', async () => {
    mockFetchRewards.mockResolvedValue({
      isEligibleForRewards: false,
    } as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
    const lastRewardsFetchRef = {
      current: {} as Partial<Record<string, number>>,
    };
    const params = makeParams({ lastRewardsFetchRef });
    await refreshRewardsEligibility(params);
    expect(
      lastRewardsFetchRef.current[DEFAULT_SERVICE_CONFIG_ID],
    ).toBeDefined();
    const after = lastRewardsFetchRef.current[DEFAULT_SERVICE_CONFIG_ID] ?? 0;
    expect(Date.now() - after).toBeLessThan(1000);
  });

  it('uses throttle window from REWARDS_POLL_SECONDS', async () => {
    // Set fetch timestamp to just before throttle window expires
    const almostExpired = Date.now() - (REWARDS_POLL_SECONDS * 1000 - 100);
    const params = makeParams({
      lastRewardsFetchRef: {
        current: { [DEFAULT_SERVICE_CONFIG_ID]: almostExpired },
      },
    });
    await refreshRewardsEligibility(params);
    // Should still be throttled
    expect(mockFetchRewards).not.toHaveBeenCalled();
  });

  it('fetches when throttle window has expired', async () => {
    mockFetchRewards.mockResolvedValue({
      isEligibleForRewards: false,
    } as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
    const expired = Date.now() - (REWARDS_POLL_SECONDS * 1000 + 100);
    const params = makeParams({
      lastRewardsFetchRef: {
        current: { [DEFAULT_SERVICE_CONFIG_ID]: expired },
      },
    });
    await refreshRewardsEligibility(params);
    expect(mockFetchRewards).toHaveBeenCalled();
  });

  it('overrides isEligibleForRewards=true to false when epoch expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockFetchRewards.mockResolvedValue({
      isEligibleForRewards: true,
      livenessPeriod: 100,
      tsCheckpoint: now - 200, // epoch expired
    } as unknown as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
    const setRewardSnapshot = jest.fn();
    const logMessage = jest.fn();
    const params = makeParams({ setRewardSnapshot, logMessage });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBe(false);
    expect(setRewardSnapshot).toHaveBeenCalledWith(
      DEFAULT_SERVICE_CONFIG_ID,
      false,
    );
    expect(logMessage).toHaveBeenCalledWith(
      expect.stringContaining('epoch expired'),
    );
  });

  it('returns undefined silently when fetch throws', async () => {
    mockFetchRewards.mockRejectedValue(new Error('network error'));
    const params = makeParams();
    const result = await refreshRewardsEligibility(params);
    expect(result).toBeUndefined();
  });
});

describe('waitForEligibilityReadyHelper', () => {
  const makeParams = (
    overrides: Partial<
      Parameters<typeof waitForEligibilityReadyHelper>[0]
    > = {},
  ) => ({
    enabledRef: { current: true },
    getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true } as {
      canRun: boolean;
      reason?: string;
      loadingReason?: string;
    }),
    normalizeEligibility: jest
      .fn()
      .mockImplementation(
        (e: { canRun: boolean; reason?: string; loadingReason?: string }) => e,
      ),
    recordMetric: jest.fn(),
    logMessage: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSleepAwareDelay.mockResolvedValue(true);
  });

  it('returns true immediately when eligibility is not Loading', async () => {
    const params = makeParams();
    const result = await waitForEligibilityReadyHelper(params);
    expect(result).toBe(true);
    expect(mockSleepAwareDelay).not.toHaveBeenCalled();
  });

  it('returns false immediately when auto-run is disabled', async () => {
    const params = makeParams({
      enabledRef: { current: false },
      getSelectedEligibility: jest.fn().mockReturnValue({
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
      }),
      normalizeEligibility: jest.fn().mockReturnValue({
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
      }),
    });
    const result = await waitForEligibilityReadyHelper(params);
    expect(result).toBe(false);
    expect(mockSleepAwareDelay).not.toHaveBeenCalled();
  });

  it('returns false on sleep detection (sleepAwareDelay returns false)', async () => {
    mockSleepAwareDelay.mockResolvedValueOnce(false);
    const params = makeParams({
      getSelectedEligibility: jest.fn().mockReturnValue({
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
      }),
      normalizeEligibility: jest.fn().mockReturnValue({
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
      }),
    });
    const result = await waitForEligibilityReadyHelper(params);
    expect(result).toBe(false);
    expect(params.recordMetric).not.toHaveBeenCalled();
  });

  it('returns false, records metric, and logs on 60s timeout', async () => {
    const start = 1_000_000;
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(start) // startedAt
      .mockReturnValue(start + 61_000); // subsequent calls exceed timeout

    const params = makeParams({
      getSelectedEligibility: jest.fn().mockReturnValue({
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
      }),
      normalizeEligibility: jest.fn().mockReturnValue({
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
      }),
    });

    const result = await waitForEligibilityReadyHelper(params);
    expect(result).toBe(false);
    expect(params.recordMetric).toHaveBeenCalledWith(
      AUTO_RUN_HEALTH_METRIC.ELIGIBILITY_TIMEOUTS,
    );
    expect(params.logMessage).toHaveBeenCalledWith('eligibility wait timeout');
    dateNowSpy.mockRestore();
  });

  it('polls every 2s until eligibility resolves out of Loading', async () => {
    let pollCount = 0;
    const params = makeParams({
      normalizeEligibility: jest.fn().mockImplementation(() => {
        pollCount += 1;
        // First two polls: still Loading. Third: resolved.
        if (pollCount <= 2) {
          return { canRun: false, reason: ELIGIBILITY_REASON.LOADING };
        }
        return { canRun: true };
      }),
    });

    const result = await waitForEligibilityReadyHelper(params);
    expect(result).toBe(true);
    expect(mockSleepAwareDelay).toHaveBeenCalledTimes(2);
    expect(mockSleepAwareDelay).toHaveBeenCalledWith(2);
  });
});
