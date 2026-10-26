import { fireEvent, render, screen } from '@testing-library/react';

import { AgentActivity } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentActivity';
import { COLOR } from '../../../../../../constants/colors';
import { useAutoRunContext } from '../../../../../../context/AutoRunProvider';
import {
  useAgentActivity,
  useConnectSession,
  useEpochWorkStatus,
  useServices,
} from '../../../../../../hooks';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAgentLiveness,
  makeServiceDeployment,
} from '../../../../../helpers/factories';

jest.mock('../../../../../../hooks', () => ({
  useAgentActivity: jest.fn(),
  useConnectSession: jest.fn(),
  useEpochWorkStatus: jest.fn(),
  useServices: jest.fn(),
}));

jest.mock('../../../../../../context/AutoRunProvider', () => ({
  useAutoRunContext: jest.fn(),
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
const mockUseServices = useServices as jest.Mock;
const mockUseAutoRunContext = useAutoRunContext as jest.Mock;

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
    mockUseServices.mockReturnValue({
      selectedServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
    });
    mockUseAutoRunContext.mockReturnValue({
      enabled: false,
      stalledInstances: {},
    });
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
  describe('agent Auto-run moved on from for a stalled goal', () => {
    const stalled = {
      progress: 0,
      target: 8,
      unit: 'trades',
      periodStart: 1_700_000_000,
    };
    const STALLED_COPY =
      'Auto-run moved on: no progress toward the daily goal in the last hour (0 of 8 trades)';

    it('explains why the agent is not running', () => {
      mockUseAutoRunContext.mockReturnValue({
        enabled: true,
        stalledInstances: { [DEFAULT_SERVICE_CONFIG_ID]: stalled },
      });
      setup();
      expect(screen.getByText(STALLED_COPY)).toBeInTheDocument();
      expect(screen.queryByText('Agent is not running')).toBeNull();
    });

    it('shows the plain not-running copy once Auto-run is off', () => {
      mockUseAutoRunContext.mockReturnValue({
        enabled: false,
        stalledInstances: { [DEFAULT_SERVICE_CONFIG_ID]: stalled },
      });
      setup();
      expect(screen.getByText('Agent is not running')).toBeInTheDocument();
    });

    it("does not show another instance's reason", () => {
      mockUseAutoRunContext.mockReturnValue({
        enabled: true,
        stalledInstances: { 'sc-other': stalled },
      });
      setup();
      expect(screen.getByText('Agent is not running')).toBeInTheDocument();
    });
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

    it.each([
      [{ progress: 3, target: 8, unit: 'trades' }, '3 of 8 trades'],
      [{ progress: 0, target: 1, unit: 'trades' }, '0 of 1 trade'],
      [{ progress: 12, target: 30, unit: 'minutes' }, '12 of 30 minutes'],
    ])(
      'shows the goal progress in the goal-pending copy (%j)',
      (goalProgress, label) => {
        mockUseEpochWorkStatus.mockReturnValue({
          workStatus: 'goal-pending',
          goalProgress,
        });
        setup(runningWithRounds);
        expect(
          screen.getByText(`${GOAL_PENDING_COPY}: ${label}`, { exact: false }),
        ).toBeInTheDocument();
      },
    );

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
