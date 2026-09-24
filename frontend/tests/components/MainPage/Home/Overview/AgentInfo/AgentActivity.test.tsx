import { render, screen } from '@testing-library/react';

import { AgentActivity } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentActivity';
import { AGENT_STALL_ANNOUNCE_INTERVAL } from '../../../../../../constants/intervals';
import {
  useAgentActivity,
  useConnectSession,
  useRewardContext,
} from '../../../../../../hooks';
import {
  makeAgentHealthCheck,
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
    isAgentActive: false,
    isAgentStalled: false,
    agentHealth: {
      isHealthy: true,
      isTmHealthy: true,
      isTransitioningFast: true,
      secondsSinceLastTransition: 0,
      announceThresholdMs: AGENT_STALL_ANNOUNCE_INTERVAL,
    },
    ...over,
  });
  return render(<AgentActivity />);
};

const withRounds = (rounds: string[]) =>
  makeServiceDeployment({ healthcheck: makeAgentHealthCheck({ rounds }) });

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
    setup({ isAgentActive: true });
    expect(screen.getByText('Agent is running')).toBeInTheDocument();
  });

  it('shows "visit" copy on first run while Connect agent is running', () => {
    mockUseConnectSession.mockReturnValue({
      showRunningInfo: true,
      isFirstRun: true,
    });
    setup({ isAgentActive: true });
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
    setup({ isAgentActive: true });
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
      isAgentActive: true,
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
    setup({ isAgentActive: true });
    expect(
      screen.queryByText(
        'Your agent is running. You can open the agent Profile to start a new session.',
      ),
    ).not.toBeInTheDocument();
  });

  // Ladder branch 4 (`rounds.length > 0`). Uncovered until now, and it is the
  // branch that absorbs a stalled agent.
  it('shows the current round when the agent is running and producing rounds', () => {
    setup({
      isAgentActive: true,
      deploymentDetails: withRounds(['sampling_round']),
    });

    expect(screen.getByText('Current action:')).toBeInTheDocument();
    expect(screen.getByText('sampling_round')).toBeInTheDocument();
  });

  // Ladder branch 3. Uncovered until now, and it is the precedence guard the
  // stall branch would sit directly below.
  it('shows the standby notice when the epoch target is met, ahead of rounds', () => {
    mockUseRewardContext.mockReturnValue({ isEpochTargetMet: true });
    setup({
      isAgentActive: true,
      deploymentDetails: withRounds(['sampling_round']),
    });

    expect(
      screen.getByText(/is in standby mode for the next epoch/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Current action:')).not.toBeInTheDocument();
  });

  // OPE-1941, pinning today's behaviour rather than the wanted behaviour.
  //
  // The hook now reports the stall, but nothing renders it: both surfaces that
  // would need copy that is still an open question on the ticket. So a stalled
  // agent still renders the round it stalled in, under "Current action:", in
  // the running state — which is exactly what the reporting operator saw for
  // two unbroken five-minute stretches before they gave up and restarted Pearl
  // by hand.
  //
  // When the stall branch lands between branches 3 and 4, this test is the one
  // that must be updated, and updating it is the point: it makes the
  // misrepresentation an executable fact instead of a paragraph on a ticket.
  it('still renders a stalled agent as running (pending the stall branch)', () => {
    setup({
      isAgentActive: true,
      isAgentStalled: true,
      agentHealth: {
        isHealthy: false,
        isTmHealthy: true,
        isTransitioningFast: false,
        secondsSinceLastTransition: 300,
        announceThresholdMs: AGENT_STALL_ANNOUNCE_INTERVAL,
      },
      deploymentDetails: withRounds(['polymarket_fetch_market_round']),
    });

    expect(screen.getByText('Current action:')).toBeInTheDocument();
    expect(
      screen.getByText('polymarket_fetch_market_round'),
    ).toBeInTheDocument();
  });

  it('shows "Agent is not running" instead of a stale round when the agent died', () => {
    // The reported symptom: the healthcheck snapshot is frozen at the round
    // the agent died in, so the round list is still populated. Rendering it
    // would show "Current action: <round>" in the active state for a process
    // that no longer exists.
    setup({
      isServiceRunning: false,
      deploymentDetails: makeServiceDeployment({
        healthcheck: makeAgentHealthCheck({
          rounds: ['collect_signature_round'],
        }),
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
