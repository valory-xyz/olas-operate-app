import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { LoaderRow } from '../../../../../../components/MainPage/Home/Overview/AgentChat/LoaderRow';
import {
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '../../../../../../constants/deployment';
import {
  useActivityGoal,
  useAgentActivity,
  useEpochWorkStatus,
  useRewardContext,
  useServices,
} from '../../../../../../hooks';
import { EpochWorkStatus } from '../../../../../../hooks/useEpochWorkStatus';
import { ActivityGoal } from '../../../../../../types/Agent';

jest.mock('../../../../../../hooks', () => ({
  useActivityGoal: jest.fn(),
  useAgentActivity: jest.fn(),
  useEpochWorkStatus: jest.fn(),
  useRewardContext: jest.fn(),
  useServices: jest.fn(),
}));

jest.mock('../../../../../../components/ui', () => ({
  Tooltip: ({
    title,
    styles,
    children,
  }: {
    title: React.ReactNode;
    styles?: { body?: { width?: number } };
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="badges-tooltip" data-width={styles?.body?.width}>
        {title}
      </div>
      {children}
    </div>
  ),
}));

jest.mock(
  '../../../../../../components/MainPage/Home/Overview/AgentInfo/AgentActivity/AgentActivityModal',
  () => ({
    AgentActivityModal: ({ open }: { open: boolean }) =>
      open ? <div>Agent Activity modal</div> : null,
  }),
);

const mockUseServices = useServices as jest.Mock;
const mockUseAgentActivity = useAgentActivity as jest.Mock;
const mockUseEpochWorkStatus = useEpochWorkStatus as jest.Mock;
const mockUseRewardContext = useRewardContext as jest.Mock;
const mockUseActivityGoal = useActivityGoal as jest.Mock;

const TS_CHECKPOINT = 1_760_000_000;

const makeGoal = (overrides: Partial<ActivityGoal> = {}): ActivityGoal => ({
  unit: 'trades',
  target: 5,
  progress: 2,
  is_met: false,
  period_start: TS_CHECKPOINT,
  last_met_at: null,
  updated_at: TS_CHECKPOINT,
  ...overrides,
});

type Setup = {
  deploymentStatus?: MiddlewareDeploymentStatus;
  isAgentActive?: boolean;
  workStatus?: EpochWorkStatus;
  rounds?: string[];
  isPending?: boolean;
  isStillThinking?: boolean;
  isMessagesOnly?: boolean;
  isEpochTargetMet?: boolean;
  activityGoal?: ActivityGoal | null;
};

const renderRow = ({
  deploymentStatus = MiddlewareDeploymentStatusMap.DEPLOYED,
  isAgentActive = true,
  workStatus = 'working',
  rounds = ['sampling_round'],
  isPending = false,
  isStillThinking = false,
  isMessagesOnly = false,
  isEpochTargetMet = false,
  activityGoal = makeGoal(),
}: Setup = {}) => {
  mockUseServices.mockReturnValue({
    selectedService: { service_config_id: 'sc-1', deploymentStatus },
  });
  mockUseAgentActivity.mockReturnValue({
    isAgentActive,
    isServiceDeploying:
      deploymentStatus === MiddlewareDeploymentStatusMap.DEPLOYING,
    deploymentDetails: {
      healthcheck: {
        rounds,
        rounds_info: { sampling_round: { name: 'Sampling a trade...' } },
      },
    },
  });
  mockUseEpochWorkStatus.mockReturnValue({ workStatus });
  mockUseRewardContext.mockReturnValue({
    isEpochTargetMet,
    stakingRewardsDetails: { tsCheckpoint: TS_CHECKPOINT },
  });
  mockUseActivityGoal.mockReturnValue({ activityGoal });
  return render(
    <LoaderRow
      isPending={isPending}
      isStillThinking={isStillThinking}
      isMessagesOnly={isMessagesOnly}
    />,
  );
};

describe('LoaderRow', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('text by state', () => {
    it.each([
      MiddlewareDeploymentStatusMap.STOPPED,
      MiddlewareDeploymentStatusMap.CREATED,
    ])(
      'is absent when the agent is stopped or never run (%s)',
      (deploymentStatus) => {
        renderRow({ deploymentStatus, isAgentActive: false });

        expect(screen.queryByTestId('loader-row')).toBeNull();
      },
    );

    it('says the agent is loading while it starts', () => {
      renderRow({
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYING,
        isAgentActive: false,
      });

      expect(screen.getByText('Agent is loading')).toBeInTheDocument();
    });

    it('shows the current step while working', () => {
      renderRow();

      expect(screen.getByText('Sampling a trade...')).toBeInTheDocument();
    });

    it('shows Thinking... while a reply is pending', () => {
      renderRow({ isPending: true });

      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    it('shows Still thinking... after 30 seconds', () => {
      renderRow({ isPending: true, isStillThinking: true });

      expect(screen.getByText('Still thinking...')).toBeInTheDocument();
    });

    it('shows standby once rewards and the target are reached', () => {
      renderRow({ workStatus: 'standby' });

      expect(
        screen.getByText('Standby until the next epoch'),
      ).toBeInTheDocument();
    });

    it('says the agent is not running when it stopped on its own', () => {
      renderRow({ isAgentActive: false });

      expect(screen.getByText('Agent is not running')).toBeInTheDocument();
    });

    it('says the agent is running before it reports any step', () => {
      renderRow({ rounds: [] });

      expect(screen.getByText('Agent is running')).toBeInTheDocument();
    });

    it('is hidden in Messages only while no reply is pending', () => {
      renderRow({ isMessagesOnly: true });

      expect(screen.queryByTestId('loader-row')).toBeNull();
    });

    it('still shows Thinking... in Messages only', () => {
      renderRow({ isMessagesOnly: true, isPending: true });

      expect(screen.getByText('Thinking...')).toBeInTheDocument();
      expect(screen.queryByTestId('badge-pending')).toBeNull();
      expect(screen.queryByTestId('badge-done')).toBeNull();
    });
  });

  it('opens the Agent Activity modal from the current step', () => {
    renderRow();

    fireEvent.click(screen.getByTestId('loader-row'));

    expect(screen.getByText('Agent Activity modal')).toBeInTheDocument();
  });

  it('does not open the Agent Activity modal while a reply is pending', () => {
    renderRow({ isPending: true });

    fireEvent.click(screen.getByTestId('loader-row'));

    expect(screen.queryByText('Agent Activity modal')).toBeNull();
  });

  describe('reward badges', () => {
    it('are grey until reached', () => {
      renderRow();

      expect(screen.getAllByTestId('badge-pending')).toHaveLength(2);
      expect(screen.getByTestId('badges-tooltip')).toHaveTextContent(
        'Activity rewards: not earned yet',
      );
      expect(screen.getByTestId('badges-tooltip')).toHaveTextContent(
        'Daily activity target: not reached yet',
      );
    });

    it('fill in once activity rewards are earned and the target is reached', () => {
      renderRow({
        isEpochTargetMet: true,
        activityGoal: makeGoal({ is_met: true, progress: 5 }),
      });

      expect(screen.getAllByTestId('badge-done')).toHaveLength(2);
      expect(screen.getByTestId('badges-tooltip')).toHaveTextContent(
        'Activity rewards: earned',
      );
      expect(screen.getByTestId('badges-tooltip')).toHaveTextContent(
        'Daily activity target: reached',
      );
    });

    it('show their values in bold in a tooltip wide enough not to wrap', () => {
      renderRow({ isEpochTargetMet: false });

      expect(screen.getByText('not earned yet').tagName).toBe('STRONG');
      expect(screen.getByText('not reached yet').tagName).toBe('STRONG');
      expect(screen.getByTestId('badges-tooltip')).toHaveAttribute(
        'data-width',
        '360',
      );
    });

    it('treat a target met in an earlier epoch as not reached', () => {
      renderRow({
        isEpochTargetMet: true,
        activityGoal: makeGoal({
          is_met: true,
          period_start: TS_CHECKPOINT - 1,
        }),
      });

      expect(screen.getAllByTestId('badge-done')).toHaveLength(1);
      expect(screen.getAllByTestId('badge-pending')).toHaveLength(1);
    });
  });
});
