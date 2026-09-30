import { act, fireEvent, render, screen } from '@testing-library/react';

import { PredictionPayout } from '../../../../components/AchievementModal/ModalContent/PredictionPayout';
import { AgentMap } from '../../../../constants/agent';
import { PREDICT_WEBSITE_URL } from '../../../../constants/urls';
import {
  makeOmenstratPayoutAchievement,
  makePolystratPayoutAchievement,
  MOCK_BET_ID,
  MOCK_OMEN_BET_ID,
  MOCK_TX_HASH_1,
} from '../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock(
  'styled-components',
  () => require('../../../mocks/styledComponents').styledComponentsMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({ PROVIDERS: {} }));
jest.mock('../../../../config/providers', () => ({}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

const mockFetch = jest.fn();
const mockWindowOpen = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({});
  global.fetch = mockFetch;
  window.open = mockWindowOpen;
});

const renderAndWarmUp = async (
  ui: Parameters<typeof render>[0],
): Promise<ReturnType<typeof render>> => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(ui);
  });
  return result;
};

describe('PredictionPayout', () => {
  describe('Omenstrat', () => {
    it('renders Omenstrat branding and trade figures', async () => {
      await renderAndWarmUp(
        <PredictionPayout
          agentType={AgentMap.PredictTrader}
          achievement={makeOmenstratPayoutAchievement()}
          areBackgroundTasksFinalized
        />,
      );

      const icon = screen.getByAltText('Omenstrat');
      expect(icon).toHaveAttribute('src', '/agent-trader-icon.png');
      expect(
        screen.getByText(/Your Omenstrat made a high-return trade/),
      ).toBeInTheDocument();
      expect(screen.getByText('2.4x')).toBeInTheDocument();
      expect(
        screen.getByText('Does Google have the best AI model end of January?'),
      ).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('$2')).toBeInTheDocument();
      expect(screen.getAllByText('$4.8')).toHaveLength(2);
    });

    it('links the transaction to Gnosis Blockscout', async () => {
      await renderAndWarmUp(
        <PredictionPayout
          agentType={AgentMap.PredictTrader}
          achievement={makeOmenstratPayoutAchievement()}
          areBackgroundTasksFinalized
        />,
      );

      expect(
        screen.getByRole('link', { name: /View transaction/ }),
      ).toHaveAttribute(
        'href',
        `https://gnosis.blockscout.com/tx/${MOCK_TX_HASH_1}`,
      );
    });

    it('never mentions Polystrat, Polymarket or Polygon', async () => {
      const { container } = await renderAndWarmUp(
        <PredictionPayout
          agentType={AgentMap.PredictTrader}
          achievement={makeOmenstratPayoutAchievement()}
          areBackgroundTasksFinalized
        />,
      );

      expect(container.innerHTML).not.toMatch(/polystrat|polymarket|polygon/i);
    });

    it('shares the omenstrat card URL with the placeholder substituted', async () => {
      const onShare = jest.fn();
      await renderAndWarmUp(
        <PredictionPayout
          agentType={AgentMap.PredictTrader}
          achievement={makeOmenstratPayoutAchievement()}
          areBackgroundTasksFinalized
          onShare={onShare}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /Share on X/ }));

      const intentUrl = new URL(mockWindowOpen.mock.calls[0][0]);
      const postText = intentUrl.searchParams.get('text');
      expect(postText).toContain(
        `${PREDICT_WEBSITE_URL}/omenstrat/achievement/?betId=${MOCK_OMEN_BET_ID}&type=payout`,
      );
      expect(postText).not.toContain('{achievement_url}');
      expect(onShare).toHaveBeenCalled();
    });
  });

  describe('Polystrat', () => {
    it('keeps Polystrat branding and the Polygon explorer', async () => {
      await renderAndWarmUp(
        <PredictionPayout
          agentType={AgentMap.Polystrat}
          achievement={makePolystratPayoutAchievement()}
          areBackgroundTasksFinalized
        />,
      );

      expect(screen.getByAltText('Polystrat')).toHaveAttribute(
        'src',
        '/agent-polymarket_trader-icon.png',
      );
      expect(
        screen.getByText(/Your Polystrat made a high-return trade/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /View transaction/ }),
      ).toHaveAttribute('href', `https://polygonscan.com/tx/${MOCK_TX_HASH_1}`);
    });

    it('never mentions Omenstrat or Gnosis', async () => {
      const { container } = await renderAndWarmUp(
        <PredictionPayout
          agentType={AgentMap.Polystrat}
          achievement={makePolystratPayoutAchievement()}
          areBackgroundTasksFinalized
        />,
      );

      expect(container.innerHTML).not.toMatch(/omenstrat|gnosis/i);
    });

    it('warms up the polystrat card URL', async () => {
      await renderAndWarmUp(
        <PredictionPayout
          agentType={AgentMap.Polystrat}
          achievement={makePolystratPayoutAchievement()}
          areBackgroundTasksFinalized
        />,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${PREDICT_WEBSITE_URL}/polystrat/achievement/?betId=${MOCK_BET_ID}&type=payout`,
        { mode: 'no-cors' },
      );
    });
  });

  it('hides the transaction link when the hash is missing', async () => {
    const achievement = makeOmenstratPayoutAchievement();
    await renderAndWarmUp(
      <PredictionPayout
        agentType={AgentMap.PredictTrader}
        achievement={{
          ...achievement,
          data: { ...achievement.data, transaction_hash: null },
        }}
        areBackgroundTasksFinalized
      />,
    );

    expect(
      screen.queryByRole('link', { name: /View transaction/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps Share loading until the background tasks finish', async () => {
    await renderAndWarmUp(
      <PredictionPayout
        agentType={AgentMap.PredictTrader}
        achievement={makeOmenstratPayoutAchievement()}
        areBackgroundTasksFinalized={false}
      />,
    );

    expect(screen.getByRole('button', { name: /Share on X/ })).toHaveClass(
      'ant-btn-loading',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('enables Share even when the warm-up fetch fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('network'));

    await renderAndWarmUp(
      <PredictionPayout
        agentType={AgentMap.PredictTrader}
        achievement={makeOmenstratPayoutAchievement()}
        areBackgroundTasksFinalized
      />,
    );

    expect(screen.getByRole('button', { name: /Share on X/ })).not.toHaveClass(
      'ant-btn-loading',
    );
    consoleSpy.mockRestore();
  });
});
