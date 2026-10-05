import { act, fireEvent, render, screen } from '@testing-library/react';

import { AchievementModal } from '../../../components/AchievementModal';
import { ACHIEVEMENT_TYPE } from '../../../constants/achievement';
import { AgentMap } from '../../../constants/agent';
import {
  makeOmenstratPayoutAchievement,
  makePolystratPayoutAchievement,
} from '../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({ PROVIDERS: {} }));
jest.mock('../../../config/providers', () => ({}));

jest.mock('next/dynamic', () => () => () => null);

jest.mock('../../../components/ui', () => ({
  Modal: ({
    open,
    action,
    onCancel,
  }: {
    open: boolean;
    action: React.ReactNode;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="achievement-modal">
        {action}
        <button onClick={onCancel}>close</button>
      </div>
    ) : null,
}));

jest.mock(
  '../../../components/AchievementModal/ModalContent/PredictionPayout',
  () => ({
    ...jest.requireActual(
      '../../../components/AchievementModal/ModalContent/PredictionPayout',
    ),
    PredictionPayout: ({
      agentType,
      onShare,
    }: {
      agentType: string;
      onShare: () => void;
    }) => (
      <div data-testid="payout-content">
        {agentType}
        <button onClick={onShare}>share</button>
      </div>
    ),
  }),
);

const mockGetAgentTypeFromService = jest.fn();
jest.mock('../../../hooks', () => ({
  useServices: () => ({ getAgentTypeFromService: mockGetAgentTypeFromService }),
}));

const mockMarkCurrentAchievementAsShown = jest.fn();
const mockSkipCurrentAchievement = jest.fn();
const mockUseCurrentAchievement = jest.fn();
jest.mock(
  '../../../components/AchievementModal/hooks/useCurrentAchievement',
  () => ({ useCurrentAchievement: () => mockUseCurrentAchievement() }),
);

const mockTriggerBackgroundTasks = jest.fn();
jest.mock(
  '../../../components/AchievementModal/hooks/useTriggerAchievementBackgroundTasks',
  () => ({
    useTriggerAchievementBackgroundTasks: () => ({
      triggerAchievementBackgroundTasks: mockTriggerBackgroundTasks,
      areBackgroundTasksFinalized: true,
    }),
  }),
);

const setCurrentAchievement = (
  currentAchievement: ReturnType<typeof makePolystratPayoutAchievement>,
) =>
  mockUseCurrentAchievement.mockReturnValue({
    currentAchievement,
    markCurrentAchievementAsShown: mockMarkCurrentAchievementAsShown,
    skipCurrentAchievement: mockSkipCurrentAchievement,
    isLoading: false,
    isError: false,
  });

const renderModal = async () => {
  let rendered!: ReturnType<typeof render>;
  await act(async () => {
    rendered = render(<AchievementModal />);
  });
  return rendered;
};

describe('AchievementModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    [AgentMap.PredictTrader, makeOmenstratPayoutAchievement()],
    [AgentMap.Polystrat, makePolystratPayoutAchievement()],
  ])('opens payout content for %s', async (agentType, achievement) => {
    mockGetAgentTypeFromService.mockReturnValue(agentType);
    setCurrentAchievement(achievement);

    await renderModal();

    expect(screen.getByTestId('payout-content')).toHaveTextContent(agentType);
    expect(mockTriggerBackgroundTasks).toHaveBeenCalledWith(achievement);
    expect(mockMarkCurrentAchievementAsShown).not.toHaveBeenCalled();
  });

  it.each(['close', 'share'])(
    'marks the achievement as shown with the display delay on %s',
    async (button) => {
      mockGetAgentTypeFromService.mockReturnValue(AgentMap.PredictTrader);
      setCurrentAchievement(makeOmenstratPayoutAchievement());

      await renderModal();
      fireEvent.click(screen.getByRole('button', { name: button }));

      expect(mockMarkCurrentAchievementAsShown).toHaveBeenCalledTimes(1);
      expect(mockSkipCurrentAchievement).not.toHaveBeenCalled();
      expect(screen.queryByTestId('achievement-modal')).not.toBeInTheDocument();
    },
  );

  it.each([
    [
      'an agent without achievement content',
      AgentMap.Optimus,
      makeOmenstratPayoutAchievement(),
    ],
    [
      'an achievement type the agent does not emit',
      AgentMap.PredictTrader,
      makeOmenstratPayoutAchievement({
        achievement_type:
          'omen/payout' as typeof ACHIEVEMENT_TYPE.OMENSTRAT_PAYOUT,
      }),
    ],
    [
      "another agent's achievement type",
      AgentMap.PredictTrader,
      makePolystratPayoutAchievement(),
    ],
  ])(
    'marks %s as shown without opening the modal',
    async (_, agentType, achievement) => {
      mockGetAgentTypeFromService.mockReturnValue(agentType);
      setCurrentAchievement(achievement);

      await renderModal();

      expect(screen.queryByTestId('achievement-modal')).not.toBeInTheDocument();
      expect(mockSkipCurrentAchievement).toHaveBeenCalled();
      expect(mockTriggerBackgroundTasks).not.toHaveBeenCalled();
    },
  );

  it('waits for the agent type before deciding', async () => {
    mockGetAgentTypeFromService.mockReturnValue(null);
    setCurrentAchievement(makeOmenstratPayoutAchievement());

    const rendered = await renderModal();

    expect(screen.queryByTestId('achievement-modal')).not.toBeInTheDocument();
    expect(mockMarkCurrentAchievementAsShown).not.toHaveBeenCalled();
    expect(mockTriggerBackgroundTasks).not.toHaveBeenCalled();

    mockGetAgentTypeFromService.mockReturnValue(AgentMap.PredictTrader);
    await act(async () => rendered.rerender(<AchievementModal />));

    expect(screen.getByTestId('achievement-modal')).toBeInTheDocument();
    expect(screen.getByTestId('payout-content')).toHaveTextContent(
      AgentMap.PredictTrader,
    );
    expect(mockTriggerBackgroundTasks).toHaveBeenCalledTimes(1);
  });
});
