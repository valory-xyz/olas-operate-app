import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Feed } from '../../../../../../components/MainPage/Home/Overview/AgentChat/Feed';
import { useServices } from '../../../../../../hooks';
import { FeedItem } from '../../../../../../utils/agentChat';
import { makeFeedEvent } from '../../../../../helpers/factories';

jest.mock('../../../../../../hooks', () => ({
  useServices: jest.fn(),
}));

const makeItem = (id: number): FeedItem => ({
  key: `entry-${id}`,
  entry: makeFeedEvent(id, { title: `Skipped market ${id}` }),
});

const ITEMS: FeedItem[] = [1, 2].map(makeItem);

type FeedProps = React.ComponentProps<typeof Feed>;

const makeProps = (overrides: Partial<FeedProps>): FeedProps => ({
  items: ITEMS,
  isLoading: false,
  isError: false,
  isPollError: false,
  hasOlder: false,
  isFetchingOlder: false,
  isFetchOlderError: false,
  fetchOlder: jest.fn(),
  emptyState: <div>empty</div>,
  onRetry: jest.fn(),
  onDismiss: jest.fn(),
  ...overrides,
});

const renderFeed = (overrides: Partial<FeedProps>) => {
  const props = makeProps(overrides);
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

  it('offers to try again when loading older entries failed', () => {
    const { fetchOlder } = renderFeed({
      hasOlder: true,
      isFetchOlderError: true,
    });

    expect(
      screen.getByText("Couldn't load earlier activity."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(fetchOlder).toHaveBeenCalledTimes(1);
  });

  it('shows no load error while older entries load fine', () => {
    renderFeed({ hasOlder: true });

    expect(
      screen.queryByText("Couldn't load earlier activity."),
    ).not.toBeInTheDocument();
  });

  it('shows the load error, not the empty state, when the first load failed', () => {
    renderFeed({ items: [], isError: true });

    expect(
      screen.getByText("Couldn't load the agent's activity."),
    ).toBeInTheDocument();
    expect(screen.queryByText('empty')).toBeNull();
  });

  it('shows the empty state when there is nothing to show', () => {
    renderFeed({ items: [] });

    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('flags a failed poll under the empty state', () => {
    renderFeed({ items: [], isPollError: true });

    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(
      screen.getByText("Couldn't load the agent's activity."),
    ).toBeInTheDocument();
  });

  it('flags a failed poll while still showing the loaded entries', () => {
    renderFeed({ isPollError: true });

    expect(
      screen.getByText("Couldn't load the agent's activity."),
    ).toBeInTheDocument();
    expect(screen.getByText('Skipped market 1')).toBeInTheDocument();
  });

  describe('when Messages only hides every loaded entry', () => {
    it('keeps loading older entries instead of showing the empty state', () => {
      const { fetchOlder } = renderFeed({ items: [], hasOlder: true });

      expect(fetchOlder).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('empty')).toBeNull();
    });

    it('waits for the older entries already loading', () => {
      const { fetchOlder } = renderFeed({
        items: [],
        hasOlder: true,
        isFetchingOlder: true,
      });

      expect(fetchOlder).not.toHaveBeenCalled();
      expect(screen.queryByText('empty')).toBeNull();
    });

    it('offers to try again, not the empty state, when an older load failed', () => {
      const { fetchOlder } = renderFeed({
        items: [],
        hasOlder: true,
        isFetchOlderError: true,
      });

      expect(fetchOlder).not.toHaveBeenCalled();
      expect(screen.queryByText('empty')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(fetchOlder).toHaveBeenCalledTimes(1);
    });

    it('shows the empty state once there are no older entries', () => {
      const { fetchOlder } = renderFeed({ items: [], hasOlder: false });

      expect(fetchOlder).not.toHaveBeenCalled();
      expect(screen.getByText('empty')).toBeInTheDocument();
    });
  });
});

/**
 * jsdom does no layout: scroll sizes are always 0 and scrollTop is not kept.
 * Give the feed's scroll area a fixed layout the tests can change.
 */
describe('Feed scroll position', () => {
  const layout = { scrollHeight: 1000, clientHeight: 400 };
  const scrollTops = new WeakMap<Element, number>();
  const scrollTo = jest.fn();
  const isFeed = (element: HTMLElement) => element.dataset.testid === 'feed';

  beforeAll(() => {
    Object.defineProperties(HTMLElement.prototype, {
      scrollHeight: {
        configurable: true,
        get(this: HTMLElement) {
          return isFeed(this) ? layout.scrollHeight : 0;
        },
      },
      clientHeight: {
        configurable: true,
        get(this: HTMLElement) {
          return isFeed(this) ? layout.clientHeight : 0;
        },
      },
      scrollTop: {
        configurable: true,
        get(this: HTMLElement) {
          return scrollTops.get(this) ?? 0;
        },
        set(this: HTMLElement, value: number) {
          scrollTops.set(this, value);
        },
      },
      scrollTo: { configurable: true, value: scrollTo },
    });
  });

  afterAll(() => {
    ['scrollHeight', 'clientHeight', 'scrollTop', 'scrollTo'].forEach(
      (property) =>
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
          property
        ],
    );
  });

  beforeEach(() => {
    layout.scrollHeight = 1000;
    layout.clientHeight = 400;
    scrollTo.mockClear();
    (useServices as jest.Mock).mockReturnValue({
      selectedAgentType: 'trader',
    });
  });

  const feedElement = () => screen.getByTestId('feed');

  const scrollFeedTo = (scrollTop: number) => {
    feedElement().scrollTop = scrollTop;
    fireEvent.scroll(feedElement());
  };

  it('opens at the latest entry', () => {
    renderFeed({});

    expect(feedElement().scrollTop).toBe(1000);
  });

  it('follows new entries while at the latest', () => {
    const { rerender } = render(<Feed {...makeProps({})} />);

    layout.scrollHeight = 1200;
    rerender(<Feed {...makeProps({ items: [...ITEMS, makeItem(3)] })} />);

    expect(feedElement().scrollTop).toBe(1200);
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).toBeNull();
  });

  it('stays put on new entries once scrolled up, and offers to jump to the latest', () => {
    const { rerender } = render(<Feed {...makeProps({})} />);
    scrollFeedTo(200);

    layout.scrollHeight = 1200;
    rerender(<Feed {...makeProps({ items: [...ITEMS, makeItem(3)] })} />);

    expect(feedElement().scrollTop).toBe(200);
    fireEvent.click(screen.getByRole('button', { name: 'Jump to latest' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'smooth' });
  });

  it('keeps the reader in place when older entries load above', () => {
    const items = [makeItem(5), makeItem(6)];
    const { rerender } = render(<Feed {...makeProps({ items })} />);
    scrollFeedTo(500);

    layout.scrollHeight = 1300;
    rerender(
      <Feed {...makeProps({ items: [makeItem(3), makeItem(4), ...items] })} />,
    );

    expect(feedElement().scrollTop).toBe(800);
  });

  it('loads older entries when scrolled near the top', () => {
    const fetchOlder = jest.fn();
    render(<Feed {...makeProps({ hasOlder: true, fetchOlder })} />);

    scrollFeedTo(40);

    expect(fetchOlder).toHaveBeenCalledTimes(1);
  });

  it('leaves loading older entries to Try again after that load failed', () => {
    const fetchOlder = jest.fn();
    render(
      <Feed
        {...makeProps({ hasOlder: true, isFetchOlderError: true, fetchOlder })}
      />,
    );

    scrollFeedTo(40);
    scrollFeedTo(20);

    expect(fetchOlder).not.toHaveBeenCalled();
  });
});
