import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import {
  AUTO_RUN_START_STATUS,
  ELIGIBILITY_REASON,
  EMPTY_REWARD_POOL_REASON,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
  SCAN_LOADING_RETRY_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import {
  ScanResult,
  useAutoRunScanner,
} from '../../../../context/AutoRunProvider/hooks/useAutoRunScanner';
import { DeployabilityCheckResult } from '../../../../context/AutoRunProvider/utils/autoRunHelpers';
import * as delayModule from '../../../../utils/delay';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAutoRunAgentMeta,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
} from '../../../helpers/factories';

jest.mock('../../../../utils/delay', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { delayMockFactory } = require('../../../helpers/autoRunMocks');
  return delayMockFactory();
});
jest.mock(
  '../../../../context/AutoRunProvider/hooks/useAutoRunVerboseLogger',
  () => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const {
      verboseLoggerMockFactory,
    } = require('../../../helpers/autoRunMocks');
    /* eslint-enable @typescript-eslint/no-var-requires */
    return verboseLoggerMockFactory();
  },
);

const mockSleepAwareDelay = delayModule.sleepAwareDelay as jest.Mock;

const scTrader = DEFAULT_SERVICE_CONFIG_ID;
const scOptimus = MOCK_SERVICE_CONFIG_ID_2;
const scPolystrat = MOCK_SERVICE_CONFIG_ID_3;

/** Deployability result for a candidate blocked solely by a drained pool. */
const emptyPool = () => ({
  canRun: false,
  reason: EMPTY_REWARD_POOL_REASON,
  isEmptyRewardPool: true,
});

/** Rewards read keyed by instance; ids absent from `statuses` read `false`. */
const rewardsById = (statuses: Record<string, boolean | undefined>) =>
  jest.fn(async (serviceConfigId: string) =>
    serviceConfigId in statuses ? statuses[serviceConfigId] : false,
  );

/** Deployability keyed by instance; ids absent from `results` can run. */
const deployabilityById = (
  results: Record<string, Partial<DeployabilityCheckResult>>,
) =>
  jest.fn(async ({ serviceConfigId }: { serviceConfigId: string }) => ({
    canRun: true,
    ...results[serviceConfigId],
  }));

const unknownRewardsLog = (serviceConfigId: string) =>
  `${serviceConfigId}: rewards status unknown, passing over`;

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunScanner>[0]> = {},
) => ({
  enabledRef: { current: true },
  orderedIncludedInstances: [scTrader, scOptimus, scPolystrat],
  configuredAgents: [
    makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
      scTrader,
    ),
    makeAutoRunAgentMeta(
      AgentMap.Optimus,
      AGENT_CONFIG[AgentMap.Optimus],
      scOptimus,
    ),
    makeAutoRunAgentMeta(
      AgentMap.Polystrat,
      AGENT_CONFIG[AgentMap.Polystrat],
      scPolystrat,
    ),
  ],
  selectedServiceConfigId: scTrader as string | null,
  getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
  waitForInstanceSelection: jest.fn().mockResolvedValue(true),
  waitForBalancesReady: jest.fn().mockResolvedValue(true),
  refreshRewardsEligibility: jest
    .fn<Promise<boolean | undefined>, [string]>()
    .mockResolvedValue(false),
  getRewardStatus: jest
    .fn<boolean | undefined, [string]>()
    .mockReturnValue(undefined),
  isStallDeferred: jest.fn<boolean, [string]>().mockReturnValue(false),
  clearStallDeferral: jest.fn(),
  getBalancesStatus: jest.fn().mockReturnValue({ ready: true, loading: false }),
  notifySkipOnce: jest.fn(),
  getDeployabilityForAgent: jest.fn().mockResolvedValue({ canRun: true }),
  startAgentWithRetries: jest.fn().mockResolvedValue({
    status: AUTO_RUN_START_STATUS.STARTED,
  }),
  scheduleNextScan: jest.fn(),
  recordMetric: jest.fn(),
  logMessage: jest.fn(),
  ...overrides,
});

describe('useAutoRunScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSleepAwareDelay.mockResolvedValue(true);
  });

  describe('getPreferredStartFrom', () => {
    it.each([
      {
        name: 'returns null when only 1 instance included',
        ordered: [scTrader],
        selected: scTrader,
        expected: null,
      },
      {
        name: 'returns previous instance so selected gets first chance',
        ordered: [scTrader, scOptimus, scPolystrat],
        selected: scOptimus,
        expected: scTrader,
      },
      {
        name: 'wraps to last instance when selected is first in order',
        ordered: [scTrader, scOptimus, scPolystrat],
        selected: scTrader,
        expected: scPolystrat,
      },
      {
        name: 'returns null when selected not in included list',
        ordered: [scTrader, scOptimus],
        selected: scPolystrat,
        expected: null,
      },
    ])('$name', ({ ordered, selected, expected }) => {
      const params = makeHookParams({
        orderedIncludedInstances: ordered,
        selectedServiceConfigId: selected,
      });
      const { result } = renderHook(() => useAutoRunScanner(params));
      expect(result.current.getPreferredStartFrom()).toBe(expected);
    });
  });

  describe('scanAndStartNext', () => {
    it('returns no started id and schedules rescan when no candidates', async () => {
      const params = makeHookParams({ orderedIncludedInstances: [] });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext();
      });
      expect(scanResult?.startedId).toBeNull();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });

    it('starts first eligible candidate and returns its id', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBe(scOptimus);
      // Started from trader, so first candidate is optimus
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scOptimus);
    });

    it('skips candidates with rewards already earned', async () => {
      const params = makeHookParams({
        refreshRewardsEligibility: jest
          .fn()
          .mockResolvedValueOnce(true) // optimus earned
          .mockResolvedValueOnce(false), // polystrat not earned
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      // optimus was skipped, polystrat was started
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scPolystrat);
    });

    it('skips blocked candidates and notifies once', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: jest
          .fn()
          // optimus: blocked
          .mockResolvedValueOnce({ canRun: false, reason: 'Low balance' })
          // polystrat: eligible
          .mockResolvedValue({ canRun: true }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      expect(params.notifySkipOnce).toHaveBeenCalledWith(
        scOptimus,
        'Low balance',
        false,
      );
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scPolystrat);
    });

    it('prefers a rewarded candidate over an empty-pool one, and notifies the skip', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: jest
          .fn()
          // optimus: empty pool → deferred
          .mockResolvedValueOnce(emptyPool())
          // polystrat: fine
          .mockResolvedValue({ canRun: true }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scPolystrat);
      expect(params.startAgentWithRetries).not.toHaveBeenCalledWith(scOptimus);
      // optimus really was passed over this cycle → surface it
      expect(params.notifySkipOnce).toHaveBeenCalledWith(
        scOptimus,
        EMPTY_REWARD_POOL_REASON,
        false,
      );
    });

    it('falls back to an empty-pool candidate when no rewarded candidate can start', async () => {
      // All three drained: running one without rewards beats idling entirely.
      const params = makeHookParams({
        getDeployabilityForAgent: jest.fn().mockResolvedValue(emptyPool()),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBe(scOptimus);
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scOptimus);
      // The one we started must not be reported as skipped...
      expect(params.notifySkipOnce).not.toHaveBeenCalledWith(
        scOptimus,
        EMPTY_REWARD_POOL_REASON,
        false,
      );
      // ...but the ones we passed over must be.
      expect(params.notifySkipOnce).toHaveBeenCalledWith(
        scPolystrat,
        EMPTY_REWARD_POOL_REASON,
        false,
      );
    });

    it('does not fall back to an empty-pool candidate that already earned this epoch', async () => {
      // Already-earned candidates are passed over *silently*, matching the main
      // loop — they would have been passed over with a full pool too, so an
      // "empty reward pool" notification would misattribute the reason.
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader, scOptimus],
        getDeployabilityForAgent: jest.fn().mockResolvedValue(emptyPool()),
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scOptimus);
      });
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });

    it('continues to the next deferred candidate when a degraded start infra-fails', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: jest.fn().mockResolvedValue(emptyPool()),
        startAgentWithRetries: jest
          .fn()
          .mockResolvedValueOnce({
            status: AUTO_RUN_START_STATUS.INFRA_FAILED,
            reason: 'RPC down',
          })
          .mockResolvedValueOnce({ status: AUTO_RUN_START_STATUS.STARTED }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBe(scPolystrat);
      expect(params.startAgentWithRetries).toHaveBeenCalledTimes(2);
      // The attempted-and-failed candidate reports via notifyStartFailed, so it
      // must NOT also be announced as an empty-pool skip.
      expect(params.notifySkipOnce).not.toHaveBeenCalledWith(
        scOptimus,
        EMPTY_REWARD_POOL_REASON,
        false,
      );
    });

    it('does not announce an empty-pool skip for a candidate that was attempted and failed', async () => {
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader, scOptimus],
        getDeployabilityForAgent: jest.fn().mockResolvedValue(emptyPool()),
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          reason: 'RPC down',
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      // Both were attempted; neither may be reported as passed over.
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('re-validates a deferred candidate and skips it when a new blocker appeared', async () => {
      // The deferred check can be ~48min stale by the time degraded mode runs.
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader, scOptimus],
        getDeployabilityForAgent: jest
          .fn()
          // Main-loop visits: both deferred for an empty pool.
          .mockResolvedValueOnce(emptyPool())
          .mockResolvedValueOnce(emptyPool())
          // Fallback re-check: balance drained in the meantime.
          .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.notifySkipOnce).toHaveBeenCalledWith(
        scOptimus,
        'Low balance',
        false,
      );
      // The stale "empty pool" reason must not be reported for it.
      expect(params.notifySkipOnce).not.toHaveBeenCalledWith(
        scOptimus,
        EMPTY_REWARD_POOL_REASON,
        false,
      );
    });

    it('starts a deferred candidate whose pool was refilled between check and fallback', async () => {
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader, scOptimus],
        getDeployabilityForAgent: jest
          .fn()
          .mockResolvedValueOnce(emptyPool())
          .mockResolvedValueOnce(emptyPool())
          .mockResolvedValue({ canRun: true }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBe(scOptimus);
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scOptimus);
    });

    it('exits the degraded-mode loop when auto-run is disabled mid-fallback', async () => {
      const enabledRef = { current: true };
      const params = makeHookParams({
        enabledRef,
        orderedIncludedInstances: [scTrader, scOptimus],
        getDeployabilityForAgent: jest.fn().mockResolvedValue(emptyPool()),
        refreshRewardsEligibility: jest
          .fn()
          // Main-loop reads for both candidates.
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          // First fallback read: the user disables auto-run meanwhile.
          .mockImplementation(async () => {
            enabledRef.current = false;
            return false;
          }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBeNull();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
    });

    it('schedules blocked delay when all candidates blocked', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: jest
          .fn()
          .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });

    it('schedules loading retry when getDeployabilityForAgent returns isTransient=true', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: jest.fn().mockResolvedValue({
          canRun: false,
          reason: 'Staking data unavailable',
          isTransient: true,
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
    });

    it('schedules eligible delay when all candidates earned rewards', async () => {
      const params = makeHookParams({
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });

    it('returns no started id when disabled mid-scan', async () => {
      const enabledRef = { current: true };
      const params = makeHookParams({
        enabledRef,
        getDeployabilityForAgent: jest.fn().mockImplementation(async () => {
          enabledRef.current = false;
          return { canRun: true };
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBeNull();
    });

    it('schedules loading retry for infra_failed start result', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          reason: 'RPC error',
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('skips candidate with missing metadata and continues to next', async () => {
      const scMissing = 'sc-missing-instance';
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader, scMissing, scOptimus],
        configuredAgents: [
          makeAutoRunAgentMeta(
            AgentMap.PredictTrader,
            AGENT_CONFIG[AgentMap.PredictTrader],
            scTrader,
          ),
          makeAutoRunAgentMeta(
            AgentMap.Optimus,
            AGENT_CONFIG[AgentMap.Optimus],
            scOptimus,
          ),
        ],
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      // scMissing was skipped (no metadata), optimus was started
      expect(scanResult?.startedId).toBe(scOptimus);
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scOptimus);
    });

    it('returns no started id when balances not ready before scan loop', async () => {
      const params = makeHookParams({
        waitForBalancesReady: jest.fn().mockResolvedValue(false),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBeNull();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('schedules rescan and returns no started id on aborted start result', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: AUTO_RUN_START_STATUS.ABORTED,
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBeNull();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('advances to next candidate on agent_blocked start result', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest
          .fn()
          .mockResolvedValueOnce({
            status: AUTO_RUN_START_STATUS.AGENT_BLOCKED,
            reason: 'Low balance',
          })
          .mockResolvedValue({
            status: AUTO_RUN_START_STATUS.STARTED,
          }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      const calls = (params.startAgentWithRetries as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe(scOptimus);
      expect(calls[1][0]).toBe(scPolystrat);
    });
  });

  describe('startSelectedAgentIfEligible', () => {
    it('returns false when selected instance not in included list', async () => {
      const params = makeHookParams({
        orderedIncludedInstances: [scOptimus, scPolystrat],
        selectedServiceConfigId: scTrader,
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
    });

    it('returns false when selected agent already earned rewards', async () => {
      const params = makeHookParams({
        getRewardStatus: jest.fn().mockReturnValue(true),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
    });

    it('returns true when selected agent starts successfully', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(true);
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scTrader);
    });

    it('returns false and notifies when selected agent blocked', async () => {
      const params = makeHookParams({
        getSelectedEligibility: jest
          .fn()
          .mockReturnValue({ canRun: false, reason: 'Low balance' }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
      expect(params.notifySkipOnce).toHaveBeenCalled();
    });

    it('returns true and schedules rescan for infra_failed', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          reason: 'timeout',
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(true);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('returns false when selected agent not in configuredAgents', async () => {
      const params = makeHookParams({
        configuredAgents: [
          makeAutoRunAgentMeta(
            AgentMap.Optimus,
            AGENT_CONFIG[AgentMap.Optimus],
            scOptimus,
          ),
        ],
        selectedServiceConfigId: scTrader,
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
    });

    it('returns true and schedules rescan for aborted start result', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: AUTO_RUN_START_STATUS.ABORTED,
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(true);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('returns false when rewards eligibility comes back as earned', async () => {
      const params = makeHookParams({
        refreshRewardsEligibility: jest.fn().mockResolvedValue(true),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
    });

    it('schedules loading retry when eligibility wait times out', async () => {
      const params = makeHookParams({
        getSelectedEligibility: jest.fn().mockReturnValue({
          canRun: false,
          reason: ELIGIBILITY_REASON.LOADING,
          loadingReason: 'Safe',
        }),
        getBalancesStatus: jest
          .fn()
          .mockReturnValue({ ready: false, loading: true }),
      });
      let callCount = 0;
      mockSleepAwareDelay.mockImplementation(async () => {
        callCount += 1;
        if (callCount >= 2) {
          jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
        }
        return true;
      });

      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
      jest.restoreAllMocks();
    });

    it('schedules loading retry when eligibility is LOADING after wait', async () => {
      const params = makeHookParams({
        getSelectedEligibility: jest
          .fn()
          .mockReturnValueOnce({ canRun: true })
          .mockReturnValue({
            canRun: false,
            reason: ELIGIBILITY_REASON.LOADING,
            loadingReason: 'Balances',
          }),
        getBalancesStatus: jest
          .fn()
          .mockReturnValue({ ready: false, loading: true }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('returns true and uses short retry for infra_failed with single instance', async () => {
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader],
        configuredAgents: [
          makeAutoRunAgentMeta(
            AgentMap.PredictTrader,
            AGENT_CONFIG[AgentMap.PredictTrader],
            scTrader,
          ),
        ],
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          reason: 'timeout',
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(true);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('returns true and does not schedule rescan for aborted when disabled', async () => {
      const enabledRef = { current: true };
      const params = makeHookParams({
        enabledRef,
        startAgentWithRetries: jest.fn().mockImplementation(async () => {
          enabledRef.current = false;
          return { status: AUTO_RUN_START_STATUS.ABORTED };
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(true);
      expect(params.scheduleNextScan).not.toHaveBeenCalled();
    });

    it('returns false for unknown start status (fallthrough)', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: 'some_unknown_status',
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
    });

    it('returns false WITHOUT notifying when deployability finds empty reward pool', async () => {
      // Deferred on purpose: the caller falls through to scanAndStartNext,
      // which may still start this instance in degraded mode. Notifying here
      // would announce a skip that never happens.
      const params = makeHookParams({
        getDeployabilityForAgent: jest.fn().mockResolvedValue(emptyPool()),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
    });

    it('still notifies for non-empty-pool deterministic blocks', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: jest
          .fn()
          .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.startSelectedAgentIfEligible();
      });
      expect(params.notifySkipOnce).toHaveBeenCalledWith(
        scTrader,
        'Low balance',
        false,
      );
    });

    it('returns false and schedules retry when deployability check returns transient block', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: jest.fn().mockResolvedValue({
          canRun: false,
          reason: 'Staking data unavailable',
          isTransient: true,
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
    });
  });

  describe('waitForEligibilityReady (via startSelectedAgentIfEligible)', () => {
    it('records metric and returns false on eligibility wait timeout', async () => {
      const params = makeHookParams({
        getSelectedEligibility: jest.fn().mockReturnValue({
          canRun: false,
          reason: ELIGIBILITY_REASON.LOADING,
          loadingReason: 'Safe',
        }),
        getBalancesStatus: jest
          .fn()
          .mockReturnValue({ ready: false, loading: true }),
      });

      let callCount = 0;
      mockSleepAwareDelay.mockImplementation(async () => {
        callCount += 1;
        if (callCount >= 2) {
          jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
        }
        return true;
      });

      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.startSelectedAgentIfEligible();
      });
      expect(params.recordMetric).toHaveBeenCalledWith('eligibilityTimeouts');
      expect(params.logMessage).toHaveBeenCalledWith(
        'eligibility wait timeout',
      );
      jest.restoreAllMocks();
    });

    it('returns false when enabledRef becomes false during eligibility wait', async () => {
      const enabledRef = { current: true };
      const params = makeHookParams({
        enabledRef,
        getSelectedEligibility: jest.fn().mockReturnValue({
          canRun: false,
          reason: ELIGIBILITY_REASON.LOADING,
          loadingReason: 'Safe',
        }),
        getBalancesStatus: jest
          .fn()
          .mockReturnValue({ ready: false, loading: true }),
      });

      mockSleepAwareDelay.mockImplementation(async () => {
        enabledRef.current = false;
        return true;
      });

      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
    });
  });

  describe('findNextInOrder (via scanAndStartNext)', () => {
    it('handles null startFrom by starting from beginning of order', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(null);
      });
      expect(scanResult?.startedId).toBe(scTrader);
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scTrader);
    });

    it('returns null (no candidate) when single instance wraps to itself', async () => {
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader],
        configuredAgents: [
          makeAutoRunAgentMeta(
            AgentMap.PredictTrader,
            AGENT_CONFIG[AgentMap.PredictTrader],
            scTrader,
          ),
        ],
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBeNull();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });
  });

  describe('scanAndStartNext — delay IIFE coverage', () => {
    it('uses blocked delay for unknown start status (sets hasBlocked)', async () => {
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader, scOptimus],
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: 'some_unknown_status',
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader);
      });
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });
  });

  describe('scanAndStartNext — ABORTED while disabled mid-scan', () => {
    it('returns no started id without scheduling when disabled on ABORTED', async () => {
      const enabledRef = { current: true };
      const params = makeHookParams({
        enabledRef,
        startAgentWithRetries: jest.fn().mockImplementation(async () => {
          enabledRef.current = false;
          return { status: AUTO_RUN_START_STATUS.ABORTED };
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBeNull();
      expect(params.scheduleNextScan).not.toHaveBeenCalled();
    });
  });
  describe('scanAndStartNext — unknown rewards status', () => {
    it('passes over a candidate whose rewards read failed, without a skip notification', async () => {
      const params = makeHookParams({
        refreshRewardsEligibility: rewardsById({ [scOptimus]: undefined }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBe(scPolystrat);
      expect(params.startAgentWithRetries).not.toHaveBeenCalledWith(scOptimus);
      expect(params.logMessage).toHaveBeenCalledWith(
        unknownRewardsLog(scOptimus),
      );
      expect(params.recordMetric).toHaveBeenCalledWith('eligibilityTimeouts');
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
    });

    it('starts nothing and rescans at the blocked delay when only unknowns are left', async () => {
      // Optimus is done for the epoch; without the unknowns the scan would
      // wait the long eligible delay.
      const params = makeHookParams({
        refreshRewardsEligibility: rewardsById({
          [scOptimus]: true,
          [scPolystrat]: undefined,
          [scTrader]: undefined,
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBeNull();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
      expect(params.scheduleNextScan).not.toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });

    it('passes over an empty-pool candidate whose fallback read failed, without a skip notification', async () => {
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader, scOptimus],
        getDeployabilityForAgent: jest.fn().mockResolvedValue(emptyPool()),
        refreshRewardsEligibility: jest
          .fn()
          // Main-loop reads: optimus, trader.
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(false)
          // Fallback reads: optimus unknown, trader not earned.
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(false),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBe(scTrader);
      expect(params.startAgentWithRetries).not.toHaveBeenCalledWith(scOptimus);
      expect(params.logMessage).toHaveBeenCalledWith(
        unknownRewardsLog(scOptimus),
      );
      expect(params.recordMetric).toHaveBeenCalledWith('eligibilityTimeouts');
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
    });
  });

  describe('scanAndStartNext — candidate order and options', () => {
    it('tries `first` before the usual order', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader, {
          first: scPolystrat,
        });
      });
      expect(scanResult?.startedId).toBe(scPolystrat);
      expect(params.startAgentWithRetries).toHaveBeenCalledTimes(1);
    });

    it('continues in the usual order when `first` fails to start', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest
          .fn()
          .mockResolvedValueOnce({
            status: AUTO_RUN_START_STATUS.INFRA_FAILED,
            reason: 'RPC down',
          })
          .mockResolvedValue({ status: AUTO_RUN_START_STATUS.STARTED }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader, {
          first: scPolystrat,
        });
      });
      expect(scanResult?.startedId).toBe(scOptimus);
      expect(
        (params.startAgentWithRetries as jest.Mock).mock.calls.map(
          ([id]) => id,
        ),
      ).toEqual([scPolystrat, scOptimus]);
    });

    it('still visits every other candidate, `from` last, after a `first` further down the order', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          reason: 'RPC down',
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader, {
          first: scPolystrat,
        });
      });
      expect(
        (params.startAgentWithRetries as jest.Mock).mock.calls.map(
          ([id]) => id,
        ),
      ).toEqual([scPolystrat, scOptimus, scTrader]);
    });

    it('ignores a `first` that is not in the included order', async () => {
      const params = makeHookParams({
        orderedIncludedInstances: [scTrader, scOptimus],
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader, {
          first: scPolystrat,
        });
      });
      expect(params.refreshRewardsEligibility).not.toHaveBeenCalledWith(
        scPolystrat,
      );
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(scOptimus);
    });

    it('passes `stoppedId` to every deployability check', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: jest
          .fn()
          .mockResolvedValue({ canRun: false, reason: 'Low balance' }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader, {
          stoppedId: scTrader,
        });
      });
      expect(params.getDeployabilityForAgent).toHaveBeenCalledTimes(3);
      expect(params.getDeployabilityForAgent).toHaveBeenCalledWith(
        expect.objectContaining({ serviceConfigId: scOptimus }),
        { stoppedId: scTrader },
      );
      for (const [, options] of (params.getDeployabilityForAgent as jest.Mock)
        .mock.calls) {
        expect(options).toEqual({ stoppedId: scTrader });
      }
    });

    it('logs a transient deployability block as a pass-over', async () => {
      const params = makeHookParams({
        getDeployabilityForAgent: deployabilityById({
          [scOptimus]: {
            canRun: false,
            reason: 'Staking data unavailable',
            isTransient: true,
          },
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(scTrader, {
          cycleId: 'c1',
          trigger: 'rewards',
        });
      });
      expect(params.logMessage).toHaveBeenCalledWith(
        `cycle=c1 trigger=rewards pass over ${scOptimus}: Staking data unavailable`,
      );
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
    });
  });

  describe('scanAndStartNext — stall-deferred candidates', () => {
    it('starts a normal candidate rather than a stall-deferred one', async () => {
      const params = makeHookParams({
        isStallDeferred: jest.fn((id: string) => id === scOptimus),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBe(scPolystrat);
      expect(params.startAgentWithRetries).not.toHaveBeenCalledWith(scOptimus);
      expect(params.clearStallDeferral).not.toHaveBeenCalled();
    });

    it('tries a stall-deferred candidate only after normal and empty-pool ones, clearing its deferral when it starts', async () => {
      const params = makeHookParams({
        isStallDeferred: jest.fn((id: string) => id === scOptimus),
        getDeployabilityForAgent: deployabilityById({
          [scPolystrat]: emptyPool(),
        }),
        startAgentWithRetries: jest
          .fn()
          // trader (normal), then polystrat (empty pool) fail; optimus starts.
          .mockResolvedValueOnce({
            status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          })
          .mockResolvedValueOnce({
            status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          })
          .mockResolvedValue({ status: AUTO_RUN_START_STATUS.STARTED }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      expect(scanResult?.startedId).toBe(scOptimus);
      expect(
        (params.startAgentWithRetries as jest.Mock).mock.calls.map(
          ([id]) => id,
        ),
      ).toEqual([scTrader, scPolystrat, scOptimus]);
      expect(params.clearStallDeferral).toHaveBeenCalledWith(scOptimus);
      expect(params.logMessage).toHaveBeenCalledWith(
        `scan: started stalled ${scOptimus}, no other agent could start`,
      );
    });
  });

  describe('scanAndStartNext — stall-deferred fallback', () => {
    // Order from trader: optimus (stall-deferred), then trader (done for the
    // epoch), so only the stalled fallback can start anything.
    const makeStalledFallbackParams = (
      overrides: Partial<Parameters<typeof useAutoRunScanner>[0]> = {},
    ) =>
      makeHookParams({
        orderedIncludedInstances: [scTrader, scOptimus],
        isStallDeferred: jest.fn((id: string) => id === scOptimus),
        refreshRewardsEligibility: rewardsById({ [scTrader]: true }),
        ...overrides,
      });

    /** Optimus reads `false` in the main loop, then `fallbackRead`. */
    const optimusRewardsThen = (fallbackRead: boolean | undefined) => {
      let optimusReads = 0;
      return jest.fn(async (serviceConfigId: string) => {
        if (serviceConfigId === scTrader) return true;
        optimusReads += 1;
        return optimusReads === 1 ? false : fallbackRead;
      });
    };

    /** Optimus can run in the main loop, then gets `recheck`. */
    const optimusDeployabilityThen = (
      recheck: Partial<DeployabilityCheckResult>,
    ) => {
      let optimusChecks = 0;
      return jest.fn(
        async ({ serviceConfigId }: { serviceConfigId: string }) => {
          if (serviceConfigId !== scOptimus) return { canRun: true };
          optimusChecks += 1;
          return optimusChecks === 1
            ? { canRun: true }
            : { canRun: false, ...recheck };
        },
      );
    };

    const scan = async (params: ReturnType<typeof makeHookParams>) => {
      const { result } = renderHook(() => useAutoRunScanner(params));
      let scanResult: ScanResult | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(scTrader);
      });
      return scanResult;
    };

    it('passes over a stalled candidate found done for the epoch on its re-read', async () => {
      const params = makeStalledFallbackParams({
        refreshRewardsEligibility: optimusRewardsThen(true),
      });

      const scanResult = await scan(params);

      expect(scanResult?.startedId).toBeNull();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.logMessage).toHaveBeenCalledWith(
        `scan: pass over ${scOptimus}: done for the epoch`,
      );
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });

    it('passes over a stalled candidate whose re-read failed, without a skip notification', async () => {
      const params = makeStalledFallbackParams({
        refreshRewardsEligibility: optimusRewardsThen(undefined),
      });

      const scanResult = await scan(params);

      expect(scanResult?.startedId).toBeNull();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.logMessage).toHaveBeenCalledWith(
        unknownRewardsLog(scOptimus),
      );
      expect(params.recordMetric).toHaveBeenCalledWith('eligibilityTimeouts');
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });

    it('passes over a stalled candidate blocked transiently on re-check, without a skip notification', async () => {
      const params = makeStalledFallbackParams({
        getDeployabilityForAgent: optimusDeployabilityThen({
          reason: ELIGIBILITY_REASON.LOADING,
          isTransient: true,
        }),
      });

      const scanResult = await scan(params);

      expect(scanResult?.startedId).toBeNull();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('notifies the skip of a stalled candidate blocked permanently on re-check', async () => {
      const params = makeStalledFallbackParams({
        getDeployabilityForAgent: optimusDeployabilityThen({
          reason: 'Low balance',
        }),
      });

      const scanResult = await scan(params);

      expect(scanResult?.startedId).toBeNull();
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.logMessage).toHaveBeenCalledWith(
        `scan: pass over ${scOptimus}: Low balance`,
      );
      expect(params.notifySkipOnce).toHaveBeenCalledWith(
        scOptimus,
        'Low balance',
        false,
      );
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });

    it.each([
      { status: AUTO_RUN_START_STATUS.ABORTED },
      { status: AUTO_RUN_START_STATUS.INFRA_FAILED },
    ])(
      'keeps the deferral and rescans soon when its start is $status',
      async ({ status }) => {
        const params = makeStalledFallbackParams({
          startAgentWithRetries: jest.fn().mockResolvedValue({ status }),
        });

        const scanResult = await scan(params);

        expect(scanResult?.startedId).toBeNull();
        expect(params.startAgentWithRetries).toHaveBeenCalledWith(scOptimus);
        expect(params.clearStallDeferral).not.toHaveBeenCalled();
        expect(params.scheduleNextScan).toHaveBeenCalledWith(
          SCAN_LOADING_RETRY_SECONDS,
        );
      },
    );
  });

  describe('startSelectedAgentIfEligible — rewards and stall gates', () => {
    it('returns false without starting when the selected instance is stall-deferred', async () => {
      const params = makeHookParams({
        isStallDeferred: jest.fn((id: string) => id === scTrader),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.waitForInstanceSelection).not.toHaveBeenCalled();
    });

    it('returns false without starting when the stored status says done for the epoch', async () => {
      const params = makeHookParams({
        getRewardStatus: jest.fn((id: string) => id === scTrader),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
      expect(params.getRewardStatus).toHaveBeenCalledWith(scTrader);
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.refreshRewardsEligibility).not.toHaveBeenCalled();
    });

    it('passes over the selected instance when its rewards status is unknown', async () => {
      const params = makeHookParams({
        refreshRewardsEligibility: jest.fn().mockResolvedValue(undefined),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
      expect(params.startAgentWithRetries).not.toHaveBeenCalled();
      expect(params.logMessage).toHaveBeenCalledWith(
        unknownRewardsLog(scTrader),
      );
      expect(params.recordMetric).toHaveBeenCalledWith('eligibilityTimeouts');
      expect(params.notifySkipOnce).not.toHaveBeenCalled();
    });
  });
});
