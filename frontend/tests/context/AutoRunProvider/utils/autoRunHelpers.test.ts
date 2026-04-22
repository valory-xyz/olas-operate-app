import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { STAKING_PROGRAM_IDS } from '../../../../constants/stakingProgram';
import {
  AUTO_RUN_HEALTH_METRIC,
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  REWARDS_POLL_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import { AgentMeta } from '../../../../context/AutoRunProvider/types';
import {
  FetchDeployabilityContext,
  fetchDeployabilityForAgent,
  formatEligibilityReason,
  isOnlyLoadingReason,
  isStakingEpochExpired,
  normalizeEligibility,
  refreshRewardsEligibility,
  waitForEligibilityReadyHelper,
} from '../../../../context/AutoRunProvider/utils/autoRunHelpers';
import { StakingState } from '../../../../types';
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

  it('calls onRewardsFetchError when fetchAgentStakingRewardsInfo throws', async () => {
    mockFetchRewards.mockRejectedValue(new Error('RPC timeout'));
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

  describe('RPC retry on transient failure (Change 3)', () => {
    it('retries once and returns value when second attempt succeeds', async () => {
      mockFetchRewards
        .mockRejectedValueOnce(new Error('transient RPC'))
        .mockResolvedValueOnce({
          isEligibleForRewards: true,
        } as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const onRewardsFetchError = jest.fn();
      const logMessage = jest.fn();
      const params = makeParams({ onRewardsFetchError, logMessage });

      const result = await refreshRewardsEligibility(params);

      expect(result).toBe(true);
      expect(mockFetchRewards).toHaveBeenCalledTimes(2);
      // Success on retry clears the prior error — no metric or log fired.
      expect(onRewardsFetchError).not.toHaveBeenCalled();
      expect(logMessage).not.toHaveBeenCalledWith(
        expect.stringContaining('rewards fetch error'),
      );
    });

    it('fires onRewardsFetchError exactly once when both attempts fail', async () => {
      mockFetchRewards.mockRejectedValue(new Error('persistent RPC'));
      const onRewardsFetchError = jest.fn();
      const params = makeParams({ onRewardsFetchError });

      await refreshRewardsEligibility(params);

      expect(mockFetchRewards).toHaveBeenCalledTimes(2);
      expect(onRewardsFetchError).toHaveBeenCalledTimes(1);
    });

    it('bails without retry when sleepAwareDelay returns false', async () => {
      mockFetchRewards.mockResolvedValueOnce(null);
      mockSleepAwareDelay.mockResolvedValueOnce(false);
      const onRewardsFetchError = jest.fn();
      const params = makeParams({ onRewardsFetchError });

      const result = await refreshRewardsEligibility(params);

      expect(result).toBeUndefined();
      // Only the first attempt ran; retry was skipped because wait was interrupted.
      expect(mockFetchRewards).toHaveBeenCalledTimes(1);
      expect(onRewardsFetchError).not.toHaveBeenCalled();
    });

    it('retries when first attempt returns null', async () => {
      mockFetchRewards.mockResolvedValueOnce(null).mockResolvedValueOnce({
        isEligibleForRewards: false,
      } as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const params = makeParams();

      const result = await refreshRewardsEligibility(params);

      expect(result).toBe(false);
      expect(mockFetchRewards).toHaveBeenCalledTimes(2);
    });
  });

  describe('stale-true local-activity override (Change 4)', () => {
    const now = Math.floor(Date.now() / 1000);
    const tsCheckpointRecent = now - 50; // 50s ago

    it('overrides stale true to false when idle agent predates last checkpoint', async () => {
      mockFetchRewards.mockResolvedValue({
        isEligibleForRewards: true,
        livenessPeriod: 3600,
        tsCheckpoint: tsCheckpointRecent,
      } as unknown as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const setRewardSnapshot = jest.fn();
      const logMessage = jest.fn();
      const params = makeParams({
        // Idle alternate — not currently running.
        runningServiceConfigIdRef: { current: 'sc-other' },
        // Last started long before the checkpoint — stale-true case.
        lastStartedAtRef: {
          current: {
            [DEFAULT_SERVICE_CONFIG_ID]: (tsCheckpointRecent - 100) * 1000,
          },
        },
        setRewardSnapshot,
        logMessage,
      });

      const result = await refreshRewardsEligibility(params);

      expect(result).toBe(false);
      expect(setRewardSnapshot).toHaveBeenCalledWith(
        DEFAULT_SERVICE_CONFIG_ID,
        false,
      );
      expect(logMessage).toHaveBeenCalledWith(
        expect.stringContaining(
          'stale isEligibleForRewards=true — last local start predates epoch checkpoint',
        ),
      );
    });

    it('does NOT override when the target is the currently-running agent', async () => {
      // Running agent just earned legitimately — its true must pass through
      // unchanged so the rotation trigger fires on the false→true transition.
      mockFetchRewards.mockResolvedValue({
        isEligibleForRewards: true,
        livenessPeriod: 3600,
        tsCheckpoint: tsCheckpointRecent,
      } as unknown as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const setRewardSnapshot = jest.fn();
      const params = makeParams({
        runningServiceConfigIdRef: { current: DEFAULT_SERVICE_CONFIG_ID },
        lastStartedAtRef: {
          // Started well before checkpoint (would otherwise match the override).
          current: {
            [DEFAULT_SERVICE_CONFIG_ID]: (tsCheckpointRecent - 100) * 1000,
          },
        },
        setRewardSnapshot,
      });

      const result = await refreshRewardsEligibility(params);

      expect(result).toBe(true);
      expect(setRewardSnapshot).toHaveBeenCalledWith(
        DEFAULT_SERVICE_CONFIG_ID,
        true,
      );
    });

    it('does NOT override when lastStartedAt is at or after tsCheckpoint', async () => {
      mockFetchRewards.mockResolvedValue({
        isEligibleForRewards: true,
        livenessPeriod: 3600,
        tsCheckpoint: tsCheckpointRecent,
      } as unknown as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const params = makeParams({
        runningServiceConfigIdRef: { current: 'sc-other' },
        lastStartedAtRef: {
          // Started AFTER last checkpoint — its true reflects current-epoch activity.
          current: {
            [DEFAULT_SERVICE_CONFIG_ID]: (tsCheckpointRecent + 10) * 1000,
          },
        },
      });

      const result = await refreshRewardsEligibility(params);
      expect(result).toBe(true);
    });

    it('does NOT override when refs are not provided (backward compat)', async () => {
      // Legacy callers that don't plumb the new refs still get the old behavior.
      mockFetchRewards.mockResolvedValue({
        isEligibleForRewards: true,
        livenessPeriod: 3600,
        tsCheckpoint: tsCheckpointRecent,
      } as unknown as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const params = makeParams();

      const result = await refreshRewardsEligibility(params);
      expect(result).toBe(true);
    });

    it('boundary: tsCheckpoint=0 does NOT trigger the stale-true override path', async () => {
      // tsCheckpointMs = 0; any `lastStartedAt >= 0` so `lastStartedAt < 0` is
      // never true → override never applied. (Another safeguard — epoch-expired
      // — may still set eligible=false; this test specifically asserts that the
      // stale-true override *code path* did not fire.)
      mockFetchRewards.mockResolvedValue({
        isEligibleForRewards: true,
        livenessPeriod: 3600,
        tsCheckpoint: 0,
      } as unknown as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const logMessage = jest.fn();
      const params = makeParams({
        runningServiceConfigIdRef: { current: 'sc-other' },
        lastStartedAtRef: {
          current: { [DEFAULT_SERVICE_CONFIG_ID]: Date.now() },
        },
        logMessage,
      });

      await refreshRewardsEligibility(params);
      expect(logMessage).not.toHaveBeenCalledWith(
        expect.stringContaining(
          'stale isEligibleForRewards=true — last local start predates epoch checkpoint',
        ),
      );
    });

    it('boundary: lastStartedAt=0 AND tsCheckpoint=0 does NOT trigger the override (0 < 0 is false)', async () => {
      mockFetchRewards.mockResolvedValue({
        isEligibleForRewards: true,
        livenessPeriod: 3600,
        tsCheckpoint: 0,
      } as unknown as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const logMessage = jest.fn();
      const params = makeParams({
        runningServiceConfigIdRef: { current: 'sc-other' },
        lastStartedAtRef: { current: {} },
        logMessage,
      });

      await refreshRewardsEligibility(params);
      expect(logMessage).not.toHaveBeenCalledWith(
        expect.stringContaining(
          'stale isEligibleForRewards=true — last local start predates epoch checkpoint',
        ),
      );
    });

    it('when epoch is expired, epoch-expiry path handles it (override is a no-op because eligible is already false)', async () => {
      // Epoch-expired safeguard sets eligible=false BEFORE the stale-true
      // override check. Asserting on log messages confirms which path fired.
      const ancient = now - 10000;
      mockFetchRewards.mockResolvedValue({
        isEligibleForRewards: true,
        livenessPeriod: 100,
        tsCheckpoint: ancient,
      } as unknown as Awaited<ReturnType<typeof fetchAgentStakingRewardsInfo>>);
      const logMessage = jest.fn();
      const params = makeParams({
        runningServiceConfigIdRef: { current: 'sc-other' },
        lastStartedAtRef: {
          current: { [DEFAULT_SERVICE_CONFIG_ID]: (ancient - 100) * 1000 },
        },
        logMessage,
      });

      const result = await refreshRewardsEligibility(params);
      expect(result).toBe(false);
      // Epoch-expiry log fired.
      expect(logMessage).toHaveBeenCalledWith(
        expect.stringContaining('epoch expired'),
      );
      // Stale-true override log did NOT fire (guarded by `eligible === true`
      // which is false by the time the override check runs).
      expect(logMessage).not.toHaveBeenCalledWith(
        expect.stringContaining(
          'stale isEligibleForRewards=true — last local start predates epoch checkpoint',
        ),
      );
    });
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

describe('fetchDeployabilityForAgent', () => {
  const mockGetStakingContractDetails = jest.fn();
  const mockGetServiceStakingDetails = jest.fn();

  const makeAgentMeta = (): AgentMeta => {
    const base = makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    );
    return {
      ...base,
      agentConfig: {
        ...base.agentConfig,
        serviceApi: {
          ...base.agentConfig.serviceApi,
          getStakingContractDetails: mockGetStakingContractDetails,
          getServiceStakingDetails: mockGetServiceStakingDetails,
        },
      },
    } as unknown as AgentMeta;
  };

  const makeCtx = (
    overrides: Partial<FetchDeployabilityContext> = {},
  ): FetchDeployabilityContext => ({
    runningServiceConfigId: null,
    canCreateSafeForChain: jest.fn().mockReturnValue({ ok: true }),
    allowStartAgentByServiceConfigId: jest.fn().mockReturnValue(true),
    hasBalancesForServiceConfigId: jest.fn().mockReturnValue(true),
    isInstanceInitiallyFunded: jest.fn().mockReturnValue(true),
    isGeoRestrictedForAgent: jest.fn().mockReturnValue(false),
    logMessage: jest.fn(),
    ...overrides,
  });

  const makeOkStaking = () => ({
    contractDetails: {
      serviceIds: [1, 2],
      maxNumServices: 10,
      minimumStakingDuration: 86400,
    },
    stakingDetails: {
      serviceStakingState: StakingState.Staked,
      serviceStakingStartTime: Math.floor(Date.now() / 1000) - 100,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { contractDetails, stakingDetails } = makeOkStaking();
    mockGetStakingContractDetails.mockResolvedValue(contractDetails);
    mockGetServiceStakingDetails.mockResolvedValue(stakingDetails);
  });

  it('returns canRun=true when all checks pass', async () => {
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), makeCtx());
    expect(result).toEqual({ canRun: true });
  });

  it('returns canRun=false isTransient=true when safe is loading', async () => {
    const ctx = makeCtx({
      canCreateSafeForChain: jest
        .fn()
        .mockReturnValue({ ok: false, isLoading: true }),
    });
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), ctx);
    expect(result.canRun).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.reason).toMatch(/safe/i);
  });

  it('returns canRun=false when safe is not ready', async () => {
    const ctx = makeCtx({
      canCreateSafeForChain: jest
        .fn()
        .mockReturnValue({ ok: false, reason: 'No wallet' }),
    });
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), ctx);
    expect(result.canRun).toBe(false);
    expect(result.reason).toBe('No wallet');
  });

  it('returns canRun=false when agent is under construction', async () => {
    const meta = {
      ...makeAgentMeta(),
      agentConfig: {
        ...makeAgentMeta().agentConfig,
        isUnderConstruction: true,
      },
    };
    const result = await fetchDeployabilityForAgent(meta, makeCtx());
    expect(result.canRun).toBe(false);
    expect(result.reason).toBe('Under construction');
  });

  it('returns canRun=false when agent is geo-restricted', async () => {
    const meta = {
      ...makeAgentMeta(),
      agentConfig: {
        ...makeAgentMeta().agentConfig,
        isGeoLocationRestricted: true,
      },
    };
    const ctx = makeCtx({
      isGeoRestrictedForAgent: jest.fn().mockReturnValue(true),
    });
    const result = await fetchDeployabilityForAgent(meta, ctx);
    expect(result.canRun).toBe(false);
    expect(result.reason).toBe('Region restricted');
  });

  it('returns canRun=false isTransient=true when another agent is running', async () => {
    const meta = makeAgentMeta();
    const ctx = makeCtx({ runningServiceConfigId: 'sc-other' });
    const result = await fetchDeployabilityForAgent(meta, ctx);
    expect(result.canRun).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.reason).toBe('Another agent running');
  });

  it('returns canRun=true when the running agent is itself', async () => {
    const meta = makeAgentMeta();
    const ctx = makeCtx({ runningServiceConfigId: meta.serviceConfigId });
    const result = await fetchDeployabilityForAgent(meta, ctx);
    expect(result.canRun).toBe(true);
  });

  it('returns canRun=false when no staking slots available and service not staked', async () => {
    mockGetStakingContractDetails.mockResolvedValue({
      serviceIds: [1, 2, 3],
      maxNumServices: 3,
      minimumStakingDuration: 86400,
    });
    mockGetServiceStakingDetails.mockResolvedValue({
      serviceStakingState: StakingState.NotStaked,
      serviceStakingStartTime: 0,
    });
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), makeCtx());
    expect(result.canRun).toBe(false);
    expect(result.reason).toBe('No available slots');
  });

  it('returns canRun=false when agent is evicted and not yet eligible', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockGetStakingContractDetails.mockResolvedValue({
      serviceIds: [1],
      maxNumServices: 10,
      minimumStakingDuration: 86400,
    });
    mockGetServiceStakingDetails.mockResolvedValue({
      serviceStakingState: StakingState.Evicted,
      serviceStakingStartTime: now - 100, // only 100s since start, min is 86400
    });
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), makeCtx());
    expect(result.canRun).toBe(false);
    expect(result.reason).toBe('Evicted');
  });

  it('returns canRun=true when agent is evicted but minimum duration elapsed', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockGetStakingContractDetails.mockResolvedValue({
      serviceIds: [1],
      maxNumServices: 10,
      minimumStakingDuration: 86400,
    });
    mockGetServiceStakingDetails.mockResolvedValue({
      serviceStakingState: StakingState.Evicted,
      serviceStakingStartTime: now - 90000, // > 86400s elapsed
    });
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), makeCtx());
    expect(result.canRun).toBe(true);
  });

  it('returns canRun=false isTransient=true when staking API throws', async () => {
    mockGetStakingContractDetails.mockRejectedValue(new Error('RPC error'));
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), makeCtx());
    expect(result.canRun).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.reason).toBe('Staking data unavailable');
  });

  it('returns canRun=false when not initially funded', async () => {
    const ctx = makeCtx({
      isInstanceInitiallyFunded: jest.fn().mockReturnValue(false),
    });
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), ctx);
    expect(result.canRun).toBe(false);
    expect(result.reason).toBe('Unfinished setup');
  });

  it('returns canRun=false isTransient=true when balance data not loaded yet', async () => {
    const ctx = makeCtx({
      hasBalancesForServiceConfigId: jest.fn().mockReturnValue(false),
    });
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), ctx);
    expect(result.canRun).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.reason).toBe('Balance data loading');
  });

  it('returns canRun=false when balance is insufficient', async () => {
    const ctx = makeCtx({
      allowStartAgentByServiceConfigId: jest.fn().mockReturnValue(false),
    });
    const result = await fetchDeployabilityForAgent(makeAgentMeta(), ctx);
    expect(result.canRun).toBe(false);
    expect(result.reason).toBe('Low balance');
  });

  it('skips staking API calls when service has no NFT token ID', async () => {
    const meta = { ...makeAgentMeta(), serviceNftTokenId: -1 };
    const result = await fetchDeployabilityForAgent(meta, makeCtx());
    expect(mockGetStakingContractDetails).not.toHaveBeenCalled();
    expect(mockGetServiceStakingDetails).not.toHaveBeenCalled();
    expect(result.canRun).toBe(true);
  });
});
