import { Button, Flex, Spin, Typography } from 'antd';
import {
  Fragment,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { TbChevronDown } from 'react-icons/tb';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { FeedItem, formatFeedDay } from '@/utils/agentChat';

import { CHAT_COPY } from './constants';
import { FeedItemView } from './FeedItemView';

const { Text } = Typography;

/** Distance from an edge, in px, that still counts as being at it. */
const EDGE_THRESHOLD = 80;

const FeedContainer = styled.div`
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
`;

const ScrollArea = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 24px;
`;

const DayTag = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  align-self: center;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid ${COLOR.BORDER_GRAY};
  background: ${COLOR.BACKGROUND};
  font-size: 12px;
  color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
`;

const JumpToLatestButton = styled(Button)`
  position: absolute;
  right: 24px;
  bottom: 8px;
  z-index: 2;
`;

type FeedProps = {
  items: FeedItem[];
  isLoading: boolean;
  isError: boolean;
  /** Polling for newer entries failed, so the feed may be behind. */
  isPollError: boolean;
  hasOlder: boolean;
  isFetchingOlder: boolean;
  /** The last attempt to load older entries failed. */
  isFetchOlderError: boolean;
  fetchOlder: () => void;
  /** Shown instead of the feed when it has nothing to show. */
  emptyState: ReactNode;
  onRetry: (clientId: string) => void;
  onDismiss: (clientId: string) => void;
};

/**
 * The agent's events and the conversation, by day. Older entries load as the
 * user scrolls up; new ones keep the view pinned to the latest while the user
 * is already there.
 */
export const Feed = ({
  items,
  isLoading,
  isError,
  isPollError,
  hasOlder,
  isFetchingOlder,
  isFetchOlderError,
  fetchOlder,
  emptyState,
  onRetry,
  onDismiss,
}: FeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const previousRef = useRef<{ firstKey?: string; scrollHeight: number }>({
    scrollHeight: 0,
  });
  const [isJumpVisible, setIsJumpVisible] = useState(false);

  const scrollToLatest = () => {
    const element = scrollRef.current;
    element?.scrollTo?.({ top: element.scrollHeight, behavior: 'smooth' });
  };

  const firstKey = items[0]?.key;

  // Keep the reader's place when older entries are prepended, and follow new
  // entries only when already at the latest.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const previous = previousRef.current;
    const isOlderPrepended =
      previous.firstKey !== undefined &&
      firstKey !== previous.firstKey &&
      items.some(({ key }) => key === previous.firstKey);
    if (isOlderPrepended) {
      element.scrollTop += element.scrollHeight - previous.scrollHeight;
    } else if (isAtBottomRef.current || firstKey !== previous.firstKey) {
      element.scrollTop = element.scrollHeight;
    }
    previousRef.current = { firstKey, scrollHeight: element.scrollHeight };
  }, [items, firstKey]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    isAtBottomRef.current = distanceFromBottom <= EDGE_THRESHOLD;
    setIsJumpVisible(!isAtBottomRef.current);
    const canFetchOlder = hasOlder && !isFetchingOlder && !isFetchOlderError;
    if (element.scrollTop <= EDGE_THRESHOLD && canFetchOlder) fetchOlder();
  };

  // Nothing to scroll means scrolling up never loads more: a short first page,
  // or Messages only hiding every loaded entry while older ones may hold some.
  useEffect(() => {
    if (!hasOlder || isFetchingOlder || isFetchOlderError) return;
    const element = scrollRef.current;
    if (!element || element.scrollHeight <= element.clientHeight) fetchOlder();
  }, [items, hasOlder, isFetchingOlder, isFetchOlderError, fetchOlder]);

  const pollError = isPollError && (
    <Text className="text-sm text-neutral-tertiary text-center">
      {CHAT_COPY.feedError}
    </Text>
  );

  const olderError = (
    <Flex justify="center" align="center" gap={8}>
      <Text className="text-sm text-neutral-tertiary">
        {CHAT_COPY.olderError}
      </Text>
      <Button size="small" onClick={() => fetchOlder()}>
        {CHAT_COPY.tryAgain}
      </Button>
    </Flex>
  );

  if (isLoading) {
    return (
      <Flex flex={1} justify="center" align="center">
        <Spin />
      </Flex>
    );
  }

  if (isError && items.length === 0) {
    return (
      <Flex flex={1} justify="center" align="center">
        <Text className="text-neutral-tertiary">{CHAT_COPY.feedError}</Text>
      </Flex>
    );
  }

  if (items.length === 0) {
    if (isFetchOlderError && !isFetchingOlder) {
      return (
        <Flex flex={1} justify="center" align="center">
          {olderError}
        </Flex>
      );
    }
    if (hasOlder) {
      return (
        <Flex flex={1} justify="center" align="center">
          <Spin />
        </Flex>
      );
    }
    return (
      <Flex vertical flex={1} className="pb-24">
        {emptyState}
        {pollError}
      </Flex>
    );
  }

  return (
    <FeedContainer>
      <ScrollArea ref={scrollRef} onScroll={handleScroll} data-testid="feed">
        <Flex vertical gap={24}>
          {isFetchingOlder && (
            <Flex justify="center">
              <Spin size="small" />
            </Flex>
          )}
          {isFetchOlderError && !isFetchingOlder && olderError}
          {items.map((item, index) => {
            const day = formatFeedDay(item.entry.ts);
            const isNewDay =
              index === 0 || formatFeedDay(items[index - 1].entry.ts) !== day;
            return (
              <Fragment key={item.key}>
                {isNewDay && <DayTag>{day}</DayTag>}
                <FeedItemView
                  item={item}
                  onRetry={onRetry}
                  onDismiss={onDismiss}
                />
              </Fragment>
            );
          })}
          {pollError}
        </Flex>
      </ScrollArea>
      {isJumpVisible && (
        <JumpToLatestButton
          shape="circle"
          icon={<TbChevronDown />}
          aria-label="Jump to latest"
          onClick={scrollToLatest}
        />
      )}
    </FeedContainer>
  );
};
