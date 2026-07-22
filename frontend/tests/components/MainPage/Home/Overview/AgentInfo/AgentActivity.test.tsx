import { render, screen } from '@testing-library/react';

import { AgentActivity } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentActivity';
import {
  useAgentActivity,
  useConnectSession,
  useRewardContext,
} from '../../../../../../hooks';

jest.mock('../../../../../../hooks', () => ({
  useAgentActivity: jest.fn(),
  useConnectSession: jest.fn(),
  useRewardContext: jest.fn(),
}));

jest.mock(
  '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentActivity/AgentActivityModal',
  () => ({ AgentActivityModal: () => null }),
);

jest.mock('../../../../../../components/ui', () => ({
  InfoTooltip: ({ children }: { children?: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

const mockUseAgentActivity = useAgentActivity as jest.Mock;
const mockUseConnectSession = useConnectSession as jest.Mock;
const mockUseRewardContext = useRewardContext as jest.Mock;

const setup = (over: Record<string, unknown> = {}) => {
  mockUseAgentActivity.mockReturnValue({
    deploymentDetails: undefined,
    isServiceRunning: false,
    isServiceDeploying: false,
    ...over,
  });
  return render(<AgentActivity />);
};

describe('AgentActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRewardContext.mockReturnValue({ isEpochTargetMet: false });
    mockUseConnectSession.mockReturnValue({ showRunningInfo: false });
  });

  it('shows "Agent is not running" when the service is stopped', () => {
    setup();
    expect(screen.getByText('Agent is not running')).toBeInTheDocument();
  });

  it('shows "Agent is loading" while deploying', () => {
    setup({ isServiceDeploying: true });
    expect(screen.getByText('Agent is loading')).toBeInTheDocument();
  });

  it('shows "Agent is running" when running without healthcheck rounds', () => {
    setup({ isServiceRunning: true });
    expect(screen.getByText('Agent is running')).toBeInTheDocument();
  });

  it('points at the agent profile while a Connect agent is running', () => {
    mockUseConnectSession.mockReturnValue({ showRunningInfo: true });
    setup({ isServiceRunning: true });
    expect(
      screen.getByText(
        'Your agent is running. Start a new session from the agent profile.',
      ),
    ).toBeInTheDocument();
  });

  it('takes priority over healthcheck rounds for Connect', () => {
    mockUseConnectSession.mockReturnValue({ showRunningInfo: true });
    setup({
      isServiceRunning: true,
      deploymentDetails: {
        healthcheck: { rounds: ['round_a'], rounds_info: {} },
      },
    });
    expect(
      screen.getByText(
        'Your agent is running. Start a new session from the agent profile.',
      ),
    ).toBeInTheDocument();
  });

  it('does not show the session notice for a stopped Connect agent', () => {
    // Defensive: even if the hook still reports running, a stopped service
    // renders the default state.
    mockUseConnectSession.mockReturnValue({ showRunningInfo: true });
    setup({ isServiceRunning: false });
    expect(screen.getByText('Agent is not running')).toBeInTheDocument();
  });

  it('does not show the session notice for non-Connect agents', () => {
    setup({ isServiceRunning: true });
    expect(
      screen.queryByText(
        'Your agent is running. Start a new session from the agent profile.',
      ),
    ).not.toBeInTheDocument();
  });
});
