import { fireEvent, render, screen } from '@testing-library/react';

import { AgentActivity } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentActivity';
import { COLOR } from '../../../../../../constants/colors';
import {
  useAgentActivity,
  useConnectSession,
  useEpochWorkStatus,
} from '../../../../../../hooks';
import {
  makeAgentLiveness,
  makeServiceDeployment,
} from '../../../../../helpers/factories';

jest.mock('../../../../../../hooks', () => ({
  useAgentActivity: jest.fn(),
  useConnectSession: jest.fn(),
  useEpochWorkStatus: jest.fn(),
}));

jest.mock(
  '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentActivity/AgentActivityModal',
  () => ({
    AgentActivityModal: ({ open }: { open: boolean }) =>
      open ? <div data-testid="agent-activity-modal" /> : null,
  }),
);

jest.mock('../../../../../../components/ui', () => ({
  InfoTooltip: ({
    children,
    iconColor,
  }: {
    children?: React.ReactNode;
    iconColor?: string;
  }) => (
    <span data-testid="info-tooltip" data-icon-color={iconColor}>
      {children}
    </span>
  ),
}));

const mockUseAgentActivity = useAgentActivity as jest.Mock;
const mockUseConnectSession = useConnectSession as jest.Mock;
const mockUseEpochWorkStatus = useEpochWorkStatus as jest.Mock;

const setup = (over: Record<string, unknown> = {}) => {
  mockUseAgentActivity.mockReturnValue({
    deploymentDetails: undefined,
    isServiceRunning: false,
    isServiceDeploying: false,
    isAgentActive: false,
    ...over,
  });
  return render(<AgentActivity />);
};

describe('AgentActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEpochWorkStatus.mockReturnValue({ workStatus: 'working' });
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
  describe('epoch work status', () => {
    const OLD_STANDBY_COPY =
      'Agent has earned staking rewards and is in standby mode for the next epoch';
    const GOAL_PENDING_COPY =
      'Agent has earned activity rewards and keeps working toward its daily goal';
    const GOAL_PENDING_TOOLTIP =
      'The agent keeps working until it reaches its daily goal for this epoch. To see or change the goal, use the agent chat in Profile.';
    const STANDBY_COPY =
      'Agent has reached its daily goal and is in standby mode for the next epoch';
    const STANDBY_TOOLTIP =
      'The agent is inactive during standby. If you keep it running, it will resume activity automatically at the start of the next epoch.';
    const runningWithRounds = {
      isAgentActive: true,
      deploymentDetails: {
        healthcheck: {
          rounds: ['decision_round'],
          rounds_info: { decision_round: { name: 'Deciding on a bet' } },
        },
      },
    };
    const statusText = (copy: string) =>
      screen.getByText(copy, { exact: false }).closest('span[class]');

    it('shows the current action while working toward rewards', () => {
      setup(runningWithRounds);
      expect(screen.getByText('Current action:')).toBeInTheDocument();
      expect(screen.getByText('Deciding on a bet')).toBeInTheDocument();
      expect(
        screen.queryByText(GOAL_PENDING_COPY, { exact: false }),
      ).toBeNull();
      expect(screen.queryByText(STANDBY_COPY, { exact: false })).toBeNull();
    });

    it('shows the current action while the goal status is still loading', () => {
      mockUseEpochWorkStatus.mockReturnValue({ workStatus: undefined });
      setup(runningWithRounds);
      expect(screen.getByText('Current action:')).toBeInTheDocument();
    });

    it('shows the goal-pending copy and tooltip in purple once rewards are earned', () => {
      mockUseEpochWorkStatus.mockReturnValue({ workStatus: 'goal-pending' });
      setup(runningWithRounds);

      expect(
        screen.getByText(GOAL_PENDING_COPY, { exact: false }),
      ).toBeInTheDocument();
      expect(screen.getByText(GOAL_PENDING_TOOLTIP)).toBeInTheDocument();
      expect(screen.getByTestId('info-tooltip')).toHaveAttribute(
        'data-icon-color',
        COLOR.PURPLE,
      );
      expect(statusText(GOAL_PENDING_COPY)).toHaveStyle({
        color: COLOR.PURPLE,
      });
      expect(screen.queryByText('Current action:')).not.toBeInTheDocument();
    });

    it('keeps the goal-pending strip clickable to open the activity modal', () => {
      mockUseEpochWorkStatus.mockReturnValue({ workStatus: 'goal-pending' });
      setup(runningWithRounds);

      fireEvent.click(screen.getByText(GOAL_PENDING_COPY, { exact: false }));
      expect(screen.getByTestId('agent-activity-modal')).toBeInTheDocument();
    });

    it('shows the standby copy and tooltip in green once the goal is reached', () => {
      mockUseEpochWorkStatus.mockReturnValue({ workStatus: 'standby' });
      setup(runningWithRounds);

      expect(
        screen.getByText(STANDBY_COPY, { exact: false }),
      ).toBeInTheDocument();
      expect(screen.getByText(STANDBY_TOOLTIP)).toBeInTheDocument();
      expect(screen.getByTestId('info-tooltip')).toHaveAttribute(
        'data-icon-color',
        COLOR.TEXT_COLOR.SUCCESS.DEFAULT,
      );
      expect(statusText(STANDBY_COPY)).toHaveStyle({
        color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT,
      });
    });

    it('renders the standby strip on the green gradient', () => {
      mockUseEpochWorkStatus.mockReturnValue({ workStatus: 'standby' });
      setup(runningWithRounds);

      const styles = Array.from(document.querySelectorAll('style'))
        .map((style) => style.textContent)
        .join('');
      expect(styles).toContain(
        `linear-gradient(180deg, ${COLOR.BG.SUCCESS.DEFAULT} 80%, ${COLOR.BG.SUCCESS.GRADIENT_END} 100%)`,
      );
    });

    it.each(['working', 'goal-pending', 'standby'])(
      'never renders the old standby copy (%s)',
      (workStatus) => {
        mockUseEpochWorkStatus.mockReturnValue({ workStatus });
        setup(runningWithRounds);
        expect(
          screen.queryByText(OLD_STANDBY_COPY, { exact: false }),
        ).toBeNull();
      },
    );

    it('keeps the Connect session text whatever the work status', () => {
      mockUseEpochWorkStatus.mockReturnValue({ workStatus: 'standby' });
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
      expect(screen.queryByText(STANDBY_COPY, { exact: false })).toBeNull();
    });
  });
});
