import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { STAKING_PROGRAM_IDS } from '../../../../constants/stakingProgram';
import {
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  REWARDS_POLL_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import {
  formatEligibilityReason,
  isOnlyLoadingReason,
  normalizeEligibility,
  refreshRewardsEligibility,
} from '../../../../context/AutoRunProvider/utils/autoRunHelpers';
import { fetchAgentStakingRewardsInfo } from '../../../../utils/stakingRewards';
import { makeAutoRunAgentMeta } from '../../../helpers/factories';

jest.mock('../../../../utils/stakingRewards', () => ({
  fetchAgentStakingRewardsInfo: jest.fn(),
}));

const mockFetchRewards = fetchAgentStakingRewardsInfo as jest.MockedFunction<
  typeof fetchAgentStakingRewardsInfo
>;

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
    agentType: AgentMap.PredictTrader,
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
        current: { [AgentMap.PredictTrader]: Date.now() },
      },
      getRewardSnapshot,
    });
    const result = await refreshRewardsEligibility(params);
    expect(result).toBe(true);
    expect(getRewardSnapshot).toHaveBeenCalledWith(AgentMap.PredictTrader);
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
      AgentMap.PredictTrader,
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
      AgentMap.PredictTrader,
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
    expect(lastRewardsFetchRef.current[AgentMap.PredictTrader]).toBeDefined();
    expect(
      Date.now() - (lastRewardsFetchRef.current[AgentMap.PredictTrader] ?? 0),
    ).toBeLessThan(1000);
  });

  it('uses throttle window from REWARDS_POLL_SECONDS', async () => {
    // Set fetch timestamp to just before throttle window expires
    const almostExpired = Date.now() - (REWARDS_POLL_SECONDS * 1000 - 100);
    const params = makeParams({
      lastRewardsFetchRef: {
        current: { [AgentMap.PredictTrader]: almostExpired },
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
        current: { [AgentMap.PredictTrader]: expired },
      },
    });
    await refreshRewardsEligibility(params);
    expect(mockFetchRewards).toHaveBeenCalled();
  });

  it('returns undefined silently when fetch throws', async () => {
    mockFetchRewards.mockRejectedValue(new Error('network error'));
    const params = makeParams();
    const result = await refreshRewardsEligibility(params);
    expect(result).toBeUndefined();
  });
});
