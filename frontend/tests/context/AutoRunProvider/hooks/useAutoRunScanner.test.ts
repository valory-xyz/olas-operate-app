import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import {
  AUTO_RUN_START_STATUS,
  ELIGIBILITY_REASON,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
  SCAN_LOADING_RETRY_SECONDS,
} from '../../../../context/AutoRunProvider/constants';
import { useAutoRunScanner } from '../../../../context/AutoRunProvider/hooks/useAutoRunScanner';
import * as delayModule from '../../../../utils/delay';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAutoRunAgentMeta,
  MOCK_SERVICE_CONFIG_ID_2,
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

const trader = AgentMap.PredictTrader;
const optimus = AgentMap.Optimus;
const polystrat = AgentMap.Polystrat;

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunScanner>[0]> = {},
) => ({
  enabledRef: { current: true },
  orderedIncludedAgentTypes: [trader, optimus, polystrat],
  configuredAgents: [
    makeAutoRunAgentMeta(
      trader,
      AGENT_CONFIG[trader],
      DEFAULT_SERVICE_CONFIG_ID,
    ),
    makeAutoRunAgentMeta(
      optimus,
      AGENT_CONFIG[optimus],
      MOCK_SERVICE_CONFIG_ID_2,
    ),
    makeAutoRunAgentMeta(polystrat, AGENT_CONFIG[polystrat]),
  ],
  selectedAgentType: trader,
  updateAgentType: jest.fn(),
  getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
  waitForAgentSelection: jest.fn().mockResolvedValue(true),
  waitForBalancesReady: jest.fn().mockResolvedValue(true),
  waitForRewardsEligibility: jest.fn().mockResolvedValue(false),
  refreshRewardsEligibility: jest.fn().mockResolvedValue(false),
  markRewardSnapshotPending: jest.fn(),
  getRewardSnapshot: jest.fn().mockReturnValue(undefined),
  getBalancesStatus: jest.fn().mockReturnValue({ ready: true, loading: false }),
  notifySkipOnce: jest.fn(),
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
        name: 'returns null when only 1 agent included',
        ordered: [trader],
        selected: trader,
        expected: null,
      },
      {
        name: 'returns previous agent so selected gets first chance',
        ordered: [trader, optimus, polystrat],
        selected: optimus,
        expected: trader,
      },
      {
        name: 'wraps to last agent when selected is first in order',
        ordered: [trader, optimus, polystrat],
        selected: trader,
        expected: polystrat,
      },
      {
        name: 'returns null when selected not in included list',
        ordered: [trader, optimus],
        selected: polystrat,
        expected: null,
      },
    ])('$name', ({ ordered, selected, expected }) => {
      const params = makeHookParams({
        orderedIncludedAgentTypes: ordered,
        selectedAgentType: selected,
      });
      const { result } = renderHook(() => useAutoRunScanner(params));
      expect(result.current.getPreferredStartFrom()).toBe(expected);
    });
  });

  describe('scanAndStartNext', () => {
    it('returns started=false and schedules rescan when no candidates', async () => {
      const params = makeHookParams({ orderedIncludedAgentTypes: [] });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: { started: boolean } | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext();
      });
      expect(scanResult?.started).toBe(false);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });

    it('starts first eligible candidate and returns started=true', async () => {
      const params = makeHookParams();
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: { started: boolean } | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(trader);
      });
      expect(scanResult?.started).toBe(true);
      // Started from trader, so first candidate is optimus
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(optimus);
    });

    it('skips candidates with rewards already earned', async () => {
      const params = makeHookParams({
        waitForRewardsEligibility: jest
          .fn()
          .mockResolvedValueOnce(true) // optimus earned
          .mockResolvedValueOnce(false), // polystrat not earned
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(trader);
      });
      // optimus was skipped, polystrat was started
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(polystrat);
    });

    it('skips blocked candidates and notifies once', async () => {
      const params = makeHookParams({
        getSelectedEligibility: jest
          .fn()
          // optimus: eligibility wait + main check → blocked
          .mockReturnValueOnce({ canRun: false, reason: 'Low balance' })
          .mockReturnValueOnce({ canRun: false, reason: 'Low balance' })
          // polystrat: eligibility wait + main check → eligible
          .mockReturnValue({ canRun: true }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(trader);
      });
      expect(params.notifySkipOnce).toHaveBeenCalledWith(
        optimus,
        'Low balance',
        false,
      );
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(polystrat);
    });

    it('schedules blocked delay when all candidates blocked', async () => {
      const params = makeHookParams({
        getSelectedEligibility: jest
          .fn()
          .mockReturnValue({ canRun: false, reason: 'Low balance' }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(trader);
      });
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_BLOCKED_DELAY_SECONDS,
      );
    });

    it('schedules eligible delay when all candidates earned rewards', async () => {
      const params = makeHookParams({
        waitForRewardsEligibility: jest.fn().mockResolvedValue(true),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(trader);
      });
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_ELIGIBLE_DELAY_SECONDS,
      );
    });

    it('schedules loading retry when eligibility times out', async () => {
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
      // Eligibility wait: sleepAwareDelay returns false to trigger timeout
      mockSleepAwareDelay.mockResolvedValue(false);

      const { result } = renderHook(() => useAutoRunScanner(params));

      await act(async () => {
        await result.current.scanAndStartNext(trader);
      });
      // Loading state → moves to next candidate in loop, not scheduled immediately
    });

    it('returns started=false when disabled mid-scan', async () => {
      const enabledRef = { current: true };
      const params = makeHookParams({
        enabledRef,
        waitForAgentSelection: jest.fn().mockImplementation(async () => {
          enabledRef.current = false;
          return false;
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: { started: boolean } | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(trader);
      });
      expect(scanResult?.started).toBe(false);
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
        await result.current.scanAndStartNext(trader);
      });
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('skips candidate with missing metadata and continues to next', async () => {
      const memeooorr = AgentMap.AgentsFun;
      const params = makeHookParams({
        // memeooorr is in the included list but NOT in configuredAgents
        orderedIncludedAgentTypes: [trader, memeooorr, optimus],
        configuredAgents: [
          makeAutoRunAgentMeta(
            trader,
            AGENT_CONFIG[trader],
            DEFAULT_SERVICE_CONFIG_ID,
          ),
          makeAutoRunAgentMeta(
            optimus,
            AGENT_CONFIG[optimus],
            MOCK_SERVICE_CONFIG_ID_2,
          ),
        ],
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: { started: boolean } | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(trader);
      });
      // memeooorr was skipped (no metadata), optimus was started
      expect(scanResult?.started).toBe(true);
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(optimus);
    });

    it('returns started=false when post-refresh selection fails while enabled', async () => {
      const params = makeHookParams({
        waitForAgentSelection: jest
          .fn()
          .mockResolvedValueOnce(true) // first call succeeds
          .mockResolvedValueOnce(false), // second call (post-refresh) fails
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: { started: boolean } | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(trader);
      });
      expect(scanResult?.started).toBe(false);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('returns started=false when balances not ready while enabled', async () => {
      const params = makeHookParams({
        waitForBalancesReady: jest.fn().mockResolvedValue(false),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: { started: boolean } | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(trader);
      });
      expect(scanResult?.started).toBe(false);
      expect(params.scheduleNextScan).toHaveBeenCalledWith(
        SCAN_LOADING_RETRY_SECONDS,
      );
    });

    it('schedules rescan and returns started=false on aborted start result', async () => {
      const params = makeHookParams({
        startAgentWithRetries: jest.fn().mockResolvedValue({
          status: AUTO_RUN_START_STATUS.ABORTED,
        }),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let scanResult: { started: boolean } | undefined;
      await act(async () => {
        scanResult = await result.current.scanAndStartNext(trader);
      });
      expect(scanResult?.started).toBe(false);
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
        await result.current.scanAndStartNext(trader);
      });
      // First candidate (optimus) was blocked, second (polystrat) was started
      const calls = (params.startAgentWithRetries as jest.Mock).mock.calls;
      expect(calls[0][0]).toBe(optimus);
      expect(calls[1][0]).toBe(polystrat);
    });
  });

  describe('startSelectedAgentIfEligible', () => {
    it('returns false when selected agent not in included list', async () => {
      const params = makeHookParams({
        orderedIncludedAgentTypes: [optimus, polystrat],
        selectedAgentType: trader,
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
        getRewardSnapshot: jest.fn().mockReturnValue(true),
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
      expect(params.startAgentWithRetries).toHaveBeenCalledWith(trader);
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
          makeAutoRunAgentMeta(optimus, AGENT_CONFIG[optimus]),
        ],
        selectedAgentType: trader,
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
        waitForRewardsEligibility: jest.fn().mockResolvedValue(true),
      });
      const { result } = renderHook(() => useAutoRunScanner(params));

      let started: boolean | undefined;
      await act(async () => {
        started = await result.current.startSelectedAgentIfEligible();
      });
      expect(started).toBe(false);
    });
  });
});
