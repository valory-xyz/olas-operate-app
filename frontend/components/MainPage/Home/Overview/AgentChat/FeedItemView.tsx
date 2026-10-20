import { Button, Flex, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { COLOR, UNICODE_SYMBOLS } from '@/constants';
import { useServices } from '@/hooks';
import { FeedEventEntry, FeedEventField } from '@/types/AgentChat';
import { FeedItem, formatFeedTime } from '@/utils/agentChat';

import { CHAT_COPY } from './constants';

const { Text } = Typography;

const isWebUrl = (url: string) => /^https?:\/\//i.test(url);

const Dot = styled.span`
  width: 4px;
  height: 4px;
  margin: 0 6px;
  border-radius: 50%;
  background: ${COLOR.NEUTRAL_4};
  flex: none;
`;

const EventFields = styled(Flex)`
  margin-left: 8px;
  padding-left: 24px;
  border-left: 1px solid ${COLOR.BORDER_GRAY};
`;

const UserBubble = styled.div`
  max-width: 80%;
  margin-left: auto;
  padding: 10px 16px;
  border-radius: 12px;
  background: ${COLOR.GRAY_1};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const AgentText = styled(Text)`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const TimeText = styled(Text)`
  flex: none;
  font-size: 12px;
  color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
`;

const FieldValue = ({ value, url }: FeedEventField) =>
  url && isWebUrl(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {value} {UNICODE_SYMBOLS.EXTERNAL_LINK}
    </a>
  ) : (
    <Text>{value}</Text>
  );

const EventCard = ({ entry }: { entry: FeedEventEntry }) => (
  <Flex vertical gap={8}>
    <Flex align="center" gap={12}>
      <Dot />
      <Text className="flex-auto">{entry.title}</Text>
      <TimeText>{formatFeedTime(entry.ts)}</TimeText>
    </Flex>
    {entry.fields.length > 0 && (
      <EventFields vertical gap={4}>
        {entry.fields.map((field, index) => (
          <Flex key={`${field.label}-${index}`} gap={8} wrap>
            <Text className="text-neutral-tertiary">{field.label}:</Text>
            <FieldValue {...field} />
          </Flex>
        ))}
      </EventFields>
    )}
  </Flex>
);

type FailureRowProps = {
  failure: NonNullable<FeedItem['failure']>;
  onRetry?: () => void;
  onDismiss: () => void;
};

const FailureRow = ({ failure, onRetry, onDismiss }: FailureRowProps) => (
  <Flex justify="flex-end" align="center" gap={8} className="text-sm">
    <Text type="danger" className="text-sm">
      {failure === 'no-funds' ? CHAT_COPY.noFunds : CHAT_COPY.failed}
    </Text>
    {failure === 'failed' && onRetry && (
      <Button type="link" size="small" className="p-0" onClick={onRetry}>
        {CHAT_COPY.tryAgain}
      </Button>
    )}
    <Button type="text" size="small" className="p-0" onClick={onDismiss}>
      {CHAT_COPY.dismiss}
    </Button>
  </Flex>
);

type FeedItemViewProps = {
  item: FeedItem;
  onRetry: (clientId: string) => void;
  onDismiss: (clientId: string) => void;
};

export const FeedItemView = ({
  item: { entry, failure },
  onRetry,
  onDismiss,
}: FeedItemViewProps) => {
  const { selectedAgentType } = useServices();

  if (entry.kind === 'event') return <EventCard entry={entry} />;

  if (entry.role === 'agent') {
    return (
      <Flex gap={12} align="flex-start">
        <Image
          src={`/agent-${selectedAgentType}-icon.png`}
          width={20}
          height={20}
          alt={selectedAgentType}
          className="rounded-4 flex-none"
        />
        <AgentText className="flex-auto">{entry.text}</AgentText>
        <TimeText>{formatFeedTime(entry.ts)}</TimeText>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={4}>
      <UserBubble>
        <Flex gap={12} align="flex-end" justify="space-between">
          <Text>{entry.text}</Text>
          <TimeText>{formatFeedTime(entry.ts)}</TimeText>
        </Flex>
      </UserBubble>
      {failure && (
        <FailureRow
          failure={failure}
          onRetry={() => onRetry(entry.client_id)}
          onDismiss={() => onDismiss(entry.client_id)}
        />
      )}
    </Flex>
  );
};
