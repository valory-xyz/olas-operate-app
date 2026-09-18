import { render, screen } from '@testing-library/react';

import { AgentActivity } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentActivity';
import {
  useAgentActivity,
  useConnectSession,
  useRewardContext,
} from '../../../../../../hooks';
import {
  makeAgentLiveness,
  makeServiceDeployment,
} from '../../../../../helpers/factories';

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
      showRunningInfo: false,
      isFirstRun: false,
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

  it('shows "visit" copy on first run while Connect agent is running', () => {
    mockUseConnectSession.mockReturnValue({
      showRunningInfo: true,
      isFirstRun: true,
    });
    setup({ isServiceRunning: true });
    expect(
      screen.getByText(
        'Your agent is running. You can visit the agent Profile to start a new session.',
      ),
    ).toBeInTheDocument();
  });

  it('shows "open" copy on subsequent runs while Connect agent is running', () => {
    mockUseConnectSession.mockReturnValue({
      showRunningInfo: true,
      isFirstRun: false,
    });
    setup({ isServiceRunning: true });
    expect(
      screen.getByText(
        'Your agent is running. You can open the agent Profile to start a new session.',
      ),
    ).toBeInTheDocument();
  });

  it('takes priority over healthcheck rounds for Connect', () => {
    mockUseConnectSession.mockReturnValue({
      showRunningInfo: true,
      isFirstRun: false,
    });
    setup({
      isServiceRunning: true,
      deploymentDetails: {
        healthcheck: { rounds: ['round_a'], rounds_info: {} },
      },
    });
    expect(
      screen.getByText(
        'Your agent is running. You can open the agent Profile to start a new session.',
      ),
    ).toBeInTheDocument();
  });

  it('does not show the session notice for a stopped Connect agent', () => {
    // Defensive: even if the hook still reports running, a stopped service
    // renders the default state.
    mockUseConnectSession.mockReturnValue({
      showRunningInfo: true,
      isFirstRun: false,
    });
    setup({ isServiceRunning: false });
    expect(screen.getByText('Agent is not running')).toBeInTheDocument();
  });

  it('does not show the session notice for non-Connect agents', () => {
    setup({ isServiceRunning: true });
    expect(
      screen.queryByText(
        'Your agent is running. You can open the agent Profile to start a new session.',
      ),
    ).not.toBeInTheDocument();
  });

  it('shows "Agent is not running" instead of a stale round when the agent died', () => {
    // The reported symptom: the healthcheck snapshot is frozen at the round
    // the agent died in, so the round list is still populated. Rendering it
    // would show "Current action: <round>" in the active state for a process
    // that no longer exists.
    setup({
      isServiceRunning: false,
      deploymentDetails: makeServiceDeployment({
        healthcheck: {
          ...makeServiceDeployment().healthcheck,
          rounds: ['collect_signature_round'],
        },
        agent_liveness: makeAgentLiveness({
          is_alive: false,
          reason: 'agent_process_exited',
        }),
      }),
    });

    expect(screen.getByText('Agent is not running')).toBeInTheDocument();
    expect(screen.queryByText('Current action:')).not.toBeInTheDocument();
    expect(
      screen.queryByText('collect_signature_round'),
    ).not.toBeInTheDocument();
  });
});
