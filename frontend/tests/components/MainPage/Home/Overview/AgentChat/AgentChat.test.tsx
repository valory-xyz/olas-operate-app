import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { AgentChat } from '../../../../../../components/MainPage/Home/Overview/AgentChat';
import { AgentMap, AgentType } from '../../../../../../constants/agent';
import {
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '../../../../../../constants/deployment';
import {
  useAgentActivity,
  useAgentChat,
  useAgentFeed,
  useServices,
} from '../../../../../../hooks';
import { FeedEntry } from '../../../../../../types/AgentChat';
import { LocalChatMessage } from '../../../../../../utils/agentChat';
import {
  DEFAULT_CHAT_CLIENT_ID,
  makeFeedAgentMessage,
  makeFeedEvent,
  makeLocalChatMessage,
} from '../../../../../helpers/factories';

jest.mock('../../../../../../hooks', () => ({
  useAgentActivity: jest.fn(),
  useAgentChat: jest.fn(),
  useAgentFeed: jest.fn(),
  useServices: jest.fn(),
}));

jest.mock('../../../../../../components/ui', () => ({
  CardFlex: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock(
  '../../../../../../components/MainPage/Home/Overview/AgentChat/Header',
  () => ({ AgentChatHeader: () => null }),
);
jest.mock(
  '../../../../../../components/MainPage/Home/Overview/AgentChat/LoaderRow',
  () => ({ LoaderRow: () => null }),
);

const mockUseServices = useServices as jest.Mock;
const mockUseAgentActivity = useAgentActivity as jest.Mock;
const mockUseAgentFeed = useAgentFeed as jest.Mock;
const mockUseAgentChat = useAgentChat as jest.Mock;

const SERVICE_CONFIG_ID = 'sc-1';
const CLIENT_ID = DEFAULT_CHAT_CLIENT_ID;

const TRADE_EVENT = makeFeedEvent(1, {
  fields: [
    {
      label: 'Market',
      value: 'Will the Fed cut rates?',
      url: 'https://polymarket.com/event/fed',
    },
    { label: 'AI confidence', value: '93%' },
  ],
});

const AGENT_MESSAGE = makeFeedAgentMessage(2, { text: 'I trade small.' });

const chat = {
  localMessages: [] as LocalChatMessage[],
  isPending: false,
  isStillThinking: false,
  isBusyNoticeOpen: false,
  closeBusyNotice: jest.fn(),
  isMessagesOnly: false,
  setMessagesOnly: jest.fn(),
  send: jest.fn(),
  retry: jest.fn(),
  dismiss: jest.fn(),
};

type Setup = {
  agentType?: AgentType;
  deploymentStatus?: MiddlewareDeploymentStatus;
  isAgentActive?: boolean;
  entries?: FeedEntry[];
  chatOverrides?: Partial<typeof chat>;
};

const renderChat = ({
  agentType = AgentMap.Polystrat,
  deploymentStatus = MiddlewareDeploymentStatusMap.DEPLOYED,
  isAgentActive = true,
  entries = [TRADE_EVENT, AGENT_MESSAGE],
  chatOverrides = {},
}: Setup = {}) => {
  mockUseServices.mockReturnValue({
    selectedAgentType: agentType,
    selectedService: { service_config_id: SERVICE_CONFIG_ID, deploymentStatus },
  });
  mockUseAgentActivity.mockReturnValue({ isAgentActive });
  mockUseAgentFeed.mockReturnValue({
    entries,
    isLoading: false,
    isError: false,
    isPollError: false,
    hasOlder: false,
    isFetchingOlder: false,
    isFetchOlderError: false,
    fetchOlder: jest.fn(),
  });
  mockUseAgentChat.mockReturnValue({ ...chat, ...chatOverrides });
  return render(<AgentChat />);
};

const messageInput = () => screen.getByLabelText('Message');
const sendButton = () => screen.getByRole('button', { name: 'Send' });

describe('AgentChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chat.send.mockReturnValue(true);
  });

  describe('feed', () => {
    it('renders an event card with its title, fields and market link', () => {
      renderChat();

      expect(screen.getByText('Placed a trade')).toBeInTheDocument();
      expect(screen.getByText('AI confidence:')).toBeInTheDocument();
      expect(screen.getByText('93%')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Will the Fed cut rates\?/ }),
      ).toHaveAttribute('href', 'https://polymarket.com/event/fed');
    });

    it('does not link a field url that is not a web address', () => {
      renderChat({
        entries: [
          {
            ...TRADE_EVENT,
            fields: [{ label: 'Market', value: 'M', url: 'file:///etc' }],
          },
        ],
      });

      expect(screen.queryByRole('link')).toBeNull();
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('hides every event when Messages only is on', () => {
      renderChat({ chatOverrides: { isMessagesOnly: true } });

      expect(screen.queryByText('Placed a trade')).toBeNull();
      expect(screen.getByText('I trade small.')).toBeInTheDocument();
    });

    it('shows a failed reply with Try again and Dismiss', () => {
      renderChat({
        chatOverrides: {
          localMessages: [makeLocalChatMessage({ state: 'failed' })],
        },
      });

      expect(screen.getByText("Couldn't get an answer.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(chat.retry).toHaveBeenCalledWith(CLIENT_ID);
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
      expect(chat.dismiss).toHaveBeenCalledWith(CLIENT_ID);
    });

    it('shows a message the Agent Wallet could not pay for with Dismiss only', () => {
      renderChat({
        chatOverrides: {
          localMessages: [makeLocalChatMessage({ state: 'no-funds' })],
        },
      });

      expect(
        screen.getByText('Not enough funds to send this message.'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Dismiss' }),
      ).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it.each([
      [AgentMap.Polystrat, 'Why did you place your last trade?'],
      [AgentMap.PredictTrader, 'Why did you place your last trade?'],
      [AgentMap.Optimus, 'Why did you choose your current pool?'],
      [AgentMap.Basius, 'Why did you choose your current pool?'],
    ])(
      'shows the 4 suggested questions for %s',
      (agentType, decisionQuestion) => {
        renderChat({ agentType, entries: [] });

        expect(screen.getByText('Ask your agent anything')).toBeInTheDocument();
        [
          'What can you do?',
          decisionQuestion,
          "What's my current configuration?",
          "What's my daily activity target?",
        ].forEach((question) =>
          expect(
            screen.getByRole('button', { name: question }),
          ).toBeInTheDocument(),
        );
      },
    );

    it('shows the dot field above the title', () => {
      renderChat({ entries: [] });

      expect(screen.getByTestId('dot-field')).toBeInTheDocument();
    });

    it('fills the input with a picked question without sending it', () => {
      renderChat({ entries: [] });

      fireEvent.click(screen.getByRole('button', { name: 'What can you do?' }));

      expect(messageInput()).toHaveValue('What can you do?');
      expect(chat.send).not.toHaveBeenCalled();
    });
  });

  describe('input by agent state', () => {
    it.each([
      MiddlewareDeploymentStatusMap.STOPPED,
      MiddlewareDeploymentStatusMap.CREATED,
      MiddlewareDeploymentStatusMap.BUILT,
    ])(
      'replaces the input with "Start the agent to chat" when status is %s',
      (deploymentStatus) => {
        renderChat({ deploymentStatus, isAgentActive: false });

        expect(screen.getByText('Start the agent to chat')).toBeInTheDocument();
        expect(screen.queryByLabelText('Message')).toBeNull();
        expect(screen.getByText('Placed a trade')).toBeInTheDocument();
      },
    );

    it.each([
      ['starting', MiddlewareDeploymentStatusMap.DEPLOYING, false],
      ['stopping', MiddlewareDeploymentStatusMap.STOPPING, false],
      ['crashed', MiddlewareDeploymentStatusMap.DEPLOYED, false],
    ] as const)(
      'shows the input disabled while %s',
      (_, deploymentStatus, isAgentActive) => {
        renderChat({ deploymentStatus, isAgentActive });

        expect(messageInput()).toBeDisabled();
        expect(sendButton()).toBeDisabled();
      },
    );

    it('enables Send while the agent is deployed and alive', () => {
      renderChat();

      fireEvent.change(messageInput(), { target: { value: 'Hi' } });

      expect(sendButton()).toBeEnabled();
    });
  });

  describe('sending', () => {
    it('sends the trimmed text and clears the input', () => {
      renderChat();

      fireEvent.change(messageInput(), { target: { value: '  Why?  ' } });
      fireEvent.click(sendButton());

      expect(chat.send).toHaveBeenCalledWith('Why?');
      expect(messageInput()).toHaveValue('');
    });

    it('sends on Enter', () => {
      renderChat();

      fireEvent.change(messageInput(), { target: { value: 'Why?' } });
      fireEvent.keyDown(messageInput(), { key: 'Enter' });

      expect(chat.send).toHaveBeenCalledWith('Why?');
    });

    it('does not send on Shift+Enter, which adds a new line', () => {
      renderChat();

      fireEvent.change(messageInput(), { target: { value: 'Why?' } });
      fireEvent.keyDown(messageInput(), { key: 'Enter', shiftKey: true });

      expect(chat.send).not.toHaveBeenCalled();
      expect(messageInput()).toHaveValue('Why?');
    });

    it('keeps the text when the message is not sent', () => {
      chat.send.mockReturnValue(false);
      renderChat();

      fireEvent.change(messageInput(), { target: { value: 'Again' } });
      fireEvent.click(sendButton());

      expect(messageInput()).toHaveValue('Again');
    });

    it('shows the busy text while a reply is pending', () => {
      renderChat({ chatOverrides: { isBusyNoticeOpen: true } });

      expect(
        screen.getByText(
          'Your agent is still thinking. Send your message after it answers.',
        ),
      ).toBeInTheDocument();
    });

    it('sends on the first Send, with no cost note', () => {
      renderChat();

      fireEvent.change(messageInput(), { target: { value: 'Why?' } });
      fireEvent.click(sendButton());

      expect(chat.send).toHaveBeenCalledWith('Why?');
      expect(screen.queryByText('Before your first message')).toBeNull();
    });

    it('shows no message cost', () => {
      const { container } = renderChat();

      expect(container).not.toHaveTextContent(/\$0\.01|costs|paid from/);
    });

    it('toggles Messages only', () => {
      renderChat({ chatOverrides: { isMessagesOnly: true } });

      fireEvent.click(screen.getByRole('button', { name: /Messages only/ }));

      expect(chat.setMessagesOnly).toHaveBeenCalledWith(false);
    });
  });
});
