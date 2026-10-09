import { renderHook } from '@testing-library/react';

import { useNotifyOnActivityGoal } from '../../../../components/MainPage/hooks/useNotifyOnActivityGoal';
import { AgentMap } from '../../../../constants/agent';
import { useActivityGoal } from '../../../../hooks/useActivityGoal';
import { useAgentRunning } from '../../../../hooks/useAgentRunning';
import { useElectronApi } from '../../../../hooks/useElectronApi';
import { ActivityGoal } from '../../../../types/Agent';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_TS_CHECKPOINT,
  makeActivityGoal,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({ PROVIDERS: {} }));

jest.mock('../../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));
jest.mock('../../../../hooks/useAgentRunning', () => ({
  useAgentRunning: jest.fn(),
}));
jest.mock('../../../../hooks/useActivityGoal', () => ({
  useActivityGoal: jest.fn(),
}));

const mockUseElectronApi = useElectronApi as jest.Mock;
const mockUseAgentRunning = useAgentRunning as jest.Mock;
const mockUseActivityGoal = useActivityGoal as jest.Mock;
const mockShowNotification = jest.fn();

const GOAL_REACHED_MESSAGE =
  'Your agent reached its daily goal for this epoch.';
const NEXT_EPOCH_START = DEFAULT_TS_CHECKPOINT + 86_400;

const setRunning = (
  runningAgentType: string | null,
  runningServiceConfigId: string | null = DEFAULT_SERVICE_CONFIG_ID,
) =>
  mockUseAgentRunning.mockReturnValue({
    runningAgentType,
    runningServiceConfigId: runningAgentType ? runningServiceConfigId : null,
  });

const setGoal = (activityGoal: ActivityGoal | null) =>
  mockUseActivityGoal.mockReturnValue({ activityGoal });

describe('useNotifyOnActivityGoal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseElectronApi.mockReturnValue({
      showNotification: mockShowNotification,
    });
    setRunning(AgentMap.PredictTrader);
  });

  it('fires once when the running agent goal turns met', () => {
    setGoal(makeActivityGoal({ is_met: false }));
    const { rerender } = renderHook(() => useNotifyOnActivityGoal());

    setGoal(makeActivityGoal({ is_met: true, progress: 8 }));
    rerender();
    setGoal(makeActivityGoal({ is_met: true, progress: 9 }));
    rerender();

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    expect(mockShowNotification).toHaveBeenCalledWith(GOAL_REACHED_MESSAGE);
  });

  it('does not fire on the first observation of an already-met goal', () => {
    setGoal(makeActivityGoal({ is_met: true }));
    const { rerender } = renderHook(() => useNotifyOnActivityGoal());
    rerender();

    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('fires again once the goal is met in the next period', () => {
    setGoal(makeActivityGoal({ is_met: false }));
    const { rerender } = renderHook(() => useNotifyOnActivityGoal());
    setGoal(makeActivityGoal({ is_met: true }));
    rerender();

    setGoal(
      makeActivityGoal({ is_met: false, period_start: NEXT_EPOCH_START }),
    );
    rerender();
    setGoal(makeActivityGoal({ is_met: true, period_start: NEXT_EPOCH_START }));
    rerender();

    expect(mockShowNotification).toHaveBeenCalledTimes(2);
  });

  it('does not fire when a new period starts already met', () => {
    setGoal(makeActivityGoal({ is_met: false }));
    const { rerender } = renderHook(() => useNotifyOnActivityGoal());
    setGoal(makeActivityGoal({ is_met: true, period_start: NEXT_EPOCH_START }));
    rerender();

    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not fire when the running instance changes to one already met', () => {
    setGoal(makeActivityGoal({ is_met: false }));
    const { rerender } = renderHook(() => useNotifyOnActivityGoal());
    setRunning(AgentMap.PredictTrader, MOCK_SERVICE_CONFIG_ID_2);
    setGoal(makeActivityGoal({ is_met: true }));
    rerender();

    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('reads the goal of the running instance', () => {
    setGoal(null);
    renderHook(() => useNotifyOnActivityGoal());
    expect(mockUseActivityGoal).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
  });

  it('stays silent for Connect and does not read its goal', () => {
    setRunning(AgentMap.Connect);
    setGoal(makeActivityGoal({ unit: 'minutes', is_met: false }));
    const { rerender } = renderHook(() => useNotifyOnActivityGoal());
    setGoal(makeActivityGoal({ unit: 'minutes', is_met: true }));
    rerender();

    expect(mockUseActivityGoal).toHaveBeenCalledWith(null);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('stays silent when nothing is running', () => {
    setRunning(null);
    setGoal(makeActivityGoal({ is_met: false }));
    const { rerender } = renderHook(() => useNotifyOnActivityGoal());
    setGoal(makeActivityGoal({ is_met: true }));
    rerender();

    expect(mockUseActivityGoal).toHaveBeenCalledWith(null);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });
});
