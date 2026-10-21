import { render, screen } from '@testing-library/react';
import React from 'react';

import { FeedItemView } from '../../../../../../components/MainPage/Home/Overview/AgentChat/FeedItemView';
import { useServices } from '../../../../../../hooks';
import { makeFeedAgentMessage } from '../../../../../helpers/factories';

jest.mock('../../../../../../hooks', () => ({
  useServices: jest.fn(),
}));

const renderAgentReply = (text: string) =>
  render(
    <FeedItemView
      item={{ key: 'entry-1', entry: makeFeedAgentMessage(1, { text }) }}
      onRetry={jest.fn()}
      onDismiss={jest.fn()}
    />,
  );

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

  it('shows raw HTML as text rather than rendering it', () => {
    const { container } = renderAgentReply('<img src=x onerror="alert(1)">');

    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(screen.getByText(/<img src=x onerror=/)).toBeInTheDocument();
  });

  it('shows an image as its alt text without loading it', () => {
    const { container } = renderAgentReply(
      '![market chart](https://example.com/chart.png)',
    );

    expect(container.querySelector('img[src*="chart.png"]')).toBeNull();
    expect(screen.getByText('market chart')).toBeInTheDocument();
  });
});
