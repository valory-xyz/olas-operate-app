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
    mockUseConnectSession.mockReturnValue({
      isConnect: false,
      errorKind: null,
    });
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

  it('points at the agent profile when the Connect session failed to launch', () => {
    mockUseConnectSession.mockReturnValue({
      isConnect: true,
      errorKind: 'launch-failed',
    });
    setup({ isServiceRunning: true });
    expect(
      screen.getByText(
        'Your agent is running. Start a new session from the agent profile.',
      ),
    ).toBeInTheDocument();
  });

  it('takes priority over healthcheck rounds when the session failed', () => {
    mockUseConnectSession.mockReturnValue({
      isConnect: true,
      errorKind: 'not-installed',
    });
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
    mockUseConnectSession.mockReturnValue({
      isConnect: true,
      errorKind: 'launch-failed',
    });
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
