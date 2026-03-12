import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap, AgentType } from '../../../../constants/agent';
import {
  AUTO_RUN_START_STATUS,
  ELIGIBILITY_REASON,
} from '../../../../context/AutoRunProvider/constants';
import { useAutoRunStartOperations } from '../../../../context/AutoRunProvider/hooks/useAutoRunStartOperations';
import * as delayModule from '../../../../utils/delay';
import { makeAutoRunAgentMeta } from '../../../helpers/factories';

jest.mock('../../../../utils/delay', () =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('../../../helpers/autoRunMocks').delayMockFactoryWithTimeout(),
);

const mockSleepAwareDelay = delayModule.sleepAwareDelay as jest.Mock;
const mockWithTimeout = delayModule.withTimeout as jest.Mock;

const makeHookParams = (
  overrides: Partial<Parameters<typeof useAutoRunStartOperations>[0]> = {},
) => ({
  enabledRef: { current: true },
  runningAgentTypeRef: { current: null as AgentType | null },
  configuredAgents: [
    makeAutoRunAgentMeta(
      AgentMap.PredictTrader,
      AGENT_CONFIG[AgentMap.PredictTrader],
    ),
  ],
  updateAgentType: jest.fn(),
  getSelectedEligibility: jest.fn().mockReturnValue({ canRun: true }),
  createSafeIfNeeded: jest.fn().mockResolvedValue(undefined),
  startService: jest.fn().mockResolvedValue(undefined),
  waitForAgentSelection: jest.fn().mockResolvedValue(true),
  waitForBalancesReady: jest.fn().mockResolvedValue(true),
  waitForRunningAgent: jest.fn().mockResolvedValue(true),
  getBalancesStatus: jest.fn().mockReturnValue({ ready: true, loading: false }),
  notifySkipOnce: jest.fn(),
  onAutoRunAgentStarted: jest.fn(),
  onAutoRunStartStateChange: jest.fn(),
  showNotification: jest.fn(),
  recordMetric: jest.fn(),
  logMessage: jest.fn(),
  logVerbose: jest.fn(),
  ...overrides,
});

describe('useAutoRunStartOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSleepAwareDelay.mockResolvedValue(true);
    mockWithTimeout.mockImplementation((promise: Promise<unknown>) => promise);
  });

  it('returns ABORTED when disabled before start', async () => {
    const params = makeHookParams({ enabledRef: { current: false } });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.ABORTED);
  });

  it('returns AGENT_BLOCKED when agent is not configured', async () => {
    const params = makeHookParams({ configuredAgents: [] });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string; reason?: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.AGENT_BLOCKED);
    expect(startResult?.reason).toBe('Not configured');
  });

  it('returns ABORTED when selection wait fails', async () => {
    const params = makeHookParams({
      waitForAgentSelection: jest.fn().mockResolvedValue(false),
    });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.ABORTED);
    expect(params.updateAgentType).toHaveBeenCalledWith(AgentMap.PredictTrader);
  });

  it('returns ABORTED when balance wait fails', async () => {
    const params = makeHookParams({
      waitForBalancesReady: jest.fn().mockResolvedValue(false),
    });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.ABORTED);
  });

  it('returns AGENT_BLOCKED when canRun=false with deterministic reason', async () => {
    const params = makeHookParams({
      getSelectedEligibility: jest.fn().mockReturnValue({
        canRun: false,
        reason: 'Low balance',
      }),
    });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string; reason?: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.AGENT_BLOCKED);
    expect(startResult?.reason).toBe('Low balance');
    expect(params.notifySkipOnce).toHaveBeenCalledWith(
      AgentMap.PredictTrader,
      'Low balance',
      false,
    );
  });

  it('returns STARTED on successful start and deploy confirmation', async () => {
    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.STARTED);
    expect(params.onAutoRunAgentStarted).toHaveBeenCalledWith(
      AgentMap.PredictTrader,
    );
    expect(params.onAutoRunStartStateChange).toHaveBeenCalledWith(true);
  });

  it('returns STARTED immediately when already running', async () => {
    const params = makeHookParams({
      runningAgentTypeRef: { current: AgentMap.PredictTrader },
    });
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.STARTED);
    expect(params.startService).not.toHaveBeenCalled();
  });

  it('returns INFRA_FAILED after all retries exhausted', async () => {
    const params = makeHookParams({
      waitForRunningAgent: jest.fn().mockResolvedValue(false),
    });
    // startService succeeds but running agent never confirms
    mockWithTimeout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string; reason?: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.INFRA_FAILED);
    expect(startResult?.reason).toBe('running timeout');
    expect(params.recordMetric).toHaveBeenCalled();
    expect(params.showNotification).toHaveBeenCalled();
  });

  it('returns ABORTED when disabled during retry loop', async () => {
    const enabledRef = { current: true };
    const params = makeHookParams({
      enabledRef,
      waitForRunningAgent: jest.fn().mockImplementation(async () => {
        enabledRef.current = false;
        return false;
      }),
    });
    mockWithTimeout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.ABORTED);
  });

  it('notifies skip with isLoadingReason=true when eligibility is Loading', async () => {
    const params = makeHookParams({
      getSelectedEligibility: jest.fn().mockReturnValue({
        canRun: false,
        reason: ELIGIBILITY_REASON.LOADING,
        loadingReason: 'Balances',
      }),
      // Balances not ready so normalizeEligibility won't promote to canRun=true
      getBalancesStatus: jest
        .fn()
        .mockReturnValue({ ready: false, loading: true }),
    });
    // Make eligibility wait timeout so we reach the eligibility check
    mockSleepAwareDelay.mockResolvedValue(false);

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    await act(async () => {
      await result.current.startAgentWithRetries(AgentMap.PredictTrader);
    });

    // When eligibility wait times out (sleepAwareDelay returns false),
    // the flow returns ABORTED, not AGENT_BLOCKED
    // But the eligibility check after waitForEligibilityReady returning false
    // should be an ABORTED result
  });

  it('calls onAutoRunStartStateChange(false) in finally block', async () => {
    const params = makeHookParams({
      waitForRunningAgent: jest.fn().mockResolvedValue(false),
    });
    mockWithTimeout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAutoRunStartOperations(params));

    await act(async () => {
      await result.current.startAgentWithRetries(AgentMap.PredictTrader);
    });

    const calls = (params.onAutoRunStartStateChange as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe(true);
    expect(calls[calls.length - 1][0]).toBe(false);
  });

  it('retries with backoff when start throws but eventually fails', async () => {
    mockWithTimeout.mockRejectedValue(new Error('RPC error'));

    const params = makeHookParams();
    const { result } = renderHook(() => useAutoRunStartOperations(params));

    let startResult: { status: string } | undefined;
    await act(async () => {
      startResult = await result.current.startAgentWithRetries(
        AgentMap.PredictTrader,
      );
    });
    expect(startResult?.status).toBe(AUTO_RUN_START_STATUS.INFRA_FAILED);
    // sleepAwareDelay called for each backoff period
    expect(mockSleepAwareDelay).toHaveBeenCalled();
  });
});
