import { render, screen } from '@testing-library/react';
import React from 'react';

import { Feed } from '../../../../../../components/MainPage/Home/Overview/AgentChat/Feed';
import { useServices } from '../../../../../../hooks';
import { FeedItem } from '../../../../../../utils/agentChat';

jest.mock('../../../../../../hooks', () => ({
  useServices: jest.fn(),
}));

const ITEMS: FeedItem[] = [1, 2].map((id) => ({
  key: `entry-${id}`,
  entry: {
    id,
    ts: 1_760_000_000 + id,
    kind: 'event',
    type: 'market_skipped',
    title: `Skipped market ${id}`,
    fields: [],
  },
}));

const renderFeed = (overrides: Partial<React.ComponentProps<typeof Feed>>) => {
  const props: React.ComponentProps<typeof Feed> = {
    items: ITEMS,
    isLoading: false,
    isError: false,
    hasOlder: false,
    isFetchingOlder: false,
    isFetchOlderError: false,
    fetchOlder: jest.fn(),
    emptyState: <div>empty</div>,
    onRetry: jest.fn(),
    onDismiss: jest.fn(),
    ...overrides,
  };
  render(<Feed {...props} />);
  return props;
};

describe('Feed', () => {
  beforeEach(() => {
    (useServices as jest.Mock).mockReturnValue({
      selectedAgentType: 'trader',
    });
  });

  it('shows a day tag above the first entry of each day', () => {
    renderFeed({});

    expect(screen.getAllByText(/Today|Yesterday|\d{4}/)).toHaveLength(1);
  });

  it('loads older entries when the loaded ones do not fill the view', () => {
    const { fetchOlder } = renderFeed({ hasOlder: true });

    expect(fetchOlder).toHaveBeenCalledTimes(1);
  });

  it('stops loading older entries after that load failed', () => {
    const { fetchOlder } = renderFeed({
      hasOlder: true,
      isFetchOlderError: true,
    });

    expect(fetchOlder).not.toHaveBeenCalled();
  });

  it('shows the empty state when there is nothing to show', () => {
    renderFeed({ items: [] });

    expect(screen.getByText('empty')).toBeInTheDocument();
  });
});
