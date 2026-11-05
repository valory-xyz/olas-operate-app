import { render, screen } from '@testing-library/react';
import React from 'react';

import { CHAT_COPY } from '../../../../../../components/MainPage/Home/Overview/AgentChat/constants';
import { FeedItemView } from '../../../../../../components/MainPage/Home/Overview/AgentChat/FeedItemView';
import { useServices } from '../../../../../../hooks';
import { FeedItem, formatFeedTime } from '../../../../../../utils/agentChat';
import {
  makeFeedAgentMessage,
  makeFeedEvent,
  makeFeedUserMessage,
} from '../../../../../helpers/factories';

jest.mock('../../../../../../hooks', () => ({
  useServices: jest.fn(),
}));

const renderItem = (item: FeedItem) =>
  render(
    <FeedItemView item={item} onRetry={jest.fn()} onDismiss={jest.fn()} />,
  );

const renderAgentReply = (text: string) =>
  renderItem({ key: 'entry-1', entry: makeFeedAgentMessage(1, { text }) });

describe('FeedItemView agent reply', () => {
  beforeEach(() => {
    (useServices as jest.Mock).mockReturnValue({
      selectedAgentType: 'trader',
    });
  });

  it('renders the markdown the agent writes', () => {
    renderAgentReply('Your **risk** is:\n\n- low\n- capped at `5%`');

    expect(screen.getByText('risk').tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('5%').tagName).toBe('CODE');
    expect(screen.queryByText(/\*\*/)).toBeNull();
  });

  it('renders GitHub-flavoured tables', () => {
    renderAgentReply('| Setting | Value |\n| --- | --- |\n| Risk | Low |');

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Low' })).toBeInTheDocument();
  });

  it('opens web links outside the app', () => {
    renderAgentReply('See [the market](https://polymarket.com/event/x).');

    const link = screen.getByRole('link', { name: 'the market' });
    expect(link).toHaveAttribute('href', 'https://polymarket.com/event/x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows a non-web link as plain text', () => {
    renderAgentReply('Open [settings](file:///etc/passwd).');

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/settings/)).toBeInTheDocument();
  });

  it('renders the HTML formatting agents reply with', () => {
    const { container } = renderAgentReply(
      'Mechs:<br><ul><li><b>0xabc</b></li><li><i>0xdef</i></li></ul>',
    );

    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('br')).not.toBeNull();
    expect(screen.getByText('0xabc').tagName).toBe('B');
    expect(screen.getByText('0xdef').tagName).toBe('I');
    expect(screen.queryByText(/<li>/)).toBeNull();
  });

  it('strips scripts and event handlers from agent HTML', () => {
    const { container } = renderAgentReply(
      '<b onclick="alert(1)">bold</b><script>alert(2)</script><img src=x onerror="alert(3)">',
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('[onclick], [onerror]')).toBeNull();
    expect(screen.getByText('bold').tagName).toBe('B');
  });

  it('keeps the link guard on HTML links', () => {
    renderAgentReply(
      '<a href="javascript:alert(1)">bad</a> <a href="https://olas.network">ok</a>',
    );

    expect(screen.getByRole('link', { name: 'ok' })).toHaveAttribute(
      'target',
      '_blank',
    );
    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
  });

  it('shows an image as its alt text without loading it', () => {
    const { container } = renderAgentReply(
      '![market chart](https://example.com/chart.png)',
    );

    expect(container.querySelector('img[src*="chart.png"]')).toBeNull();
    expect(screen.getByText('market chart')).toBeInTheDocument();
  });
});

describe('FeedItemView text selection', () => {
  const ts = 1_760_000_001;

  beforeEach(() => {
    (useServices as jest.Mock).mockReturnValue({
      selectedAgentType: 'trader',
    });
  });

  it('lets the user message be selected but not its time', () => {
    renderItem({
      key: 'entry-1',
      entry: makeFeedUserMessage(1, { text: 'What is my address?' }),
    });

    expect(screen.getByText('What is my address?')).toHaveClass(
      'can-select-text',
    );
    expect(
      screen.getByText(formatFeedTime(ts)).closest('.can-select-text'),
    ).toBeNull();
  });

  it('keeps the failure notice and its buttons non-selectable', () => {
    renderItem({
      key: 'entry-1',
      entry: makeFeedUserMessage(1),
      failure: 'failed',
    });

    expect(screen.getByText('message 1')).toHaveClass('can-select-text');
    [
      screen.getByText(CHAT_COPY.failed),
      screen.getByRole('button', { name: CHAT_COPY.tryAgain }),
      screen.getByRole('button', { name: CHAT_COPY.dismiss }),
    ].forEach((node) => expect(node.closest('.can-select-text')).toBeNull());
  });

  it('lets the reply be selected, including its markdown, but not its time', () => {
    renderAgentReply('Send to `0xabc`');

    expect(
      screen.getByText('0xabc').closest('.can-select-text'),
    ).not.toBeNull();
    expect(
      screen.getByText(formatFeedTime(ts)).closest('.can-select-text'),
    ).toBeNull();
  });

  it('lets the event title and every field row be selected but not the time', () => {
    renderItem({
      key: 'entry-1',
      entry: makeFeedEvent(1, {
        title: 'Placed a trade',
        fields: [
          { label: 'Market', value: 'Will it rain?', url: 'https://x.y/m' },
          { label: 'Amount', value: '5 pUSD' },
        ],
      }),
    });

    expect(screen.getByText('Placed a trade')).toHaveClass('can-select-text');
    ['Market:', 'Amount:'].forEach((label) =>
      expect(screen.getByText(label).parentElement).toHaveClass(
        'can-select-text',
      ),
    );
    expect(
      screen.getByRole('link', { name: /Will it rain\?/ }),
    ).toHaveAttribute('href', 'https://x.y/m');
    expect(
      screen.getByText(formatFeedTime(ts)).closest('.can-select-text'),
    ).toBeNull();
  });
});
