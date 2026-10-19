import { Button, Flex, Typography } from 'antd';
import { useMemo, useState } from 'react';
import styled from 'styled-components';

import { CardFlex } from '@/components/ui';
import { COLOR } from '@/constants';
import { isActiveDeploymentStatus } from '@/constants/deployment';
import {
  useAgentActivity,
  useAgentChat,
  useAgentFeed,
  useChatCostNote,
  useServices,
} from '@/hooks';
import { buildFeedItems } from '@/utils/agentChat';

import { ChatInput } from './ChatInput';
import { CHAT_COPY, SUGGESTED_QUESTIONS } from './constants';
import { Feed } from './Feed';
import { AgentChatHeader } from './Header';
import { LoaderRow } from './LoaderRow';

const { Title, Text } = Typography;

const CHAT_CARD_HEIGHT = 480;

const ChatCard = styled(CardFlex)`
  height: ${CHAT_CARD_HEIGHT}px;

  .ant-card-body {
    height: 100%;
    padding: 0;
  }
`;

const SuggestionButton = styled(Button)`
  border-color: ${COLOR.BORDER_GRAY};
`;

type EmptyStateProps = {
  questions: string[];
  onPick: (question: string) => void;
};

const EmptyState = ({ questions, onPick }: EmptyStateProps) => (
  <Flex vertical flex={1} justify="center" align="center" gap={24}>
    <Title level={4} className="m-0">
      {CHAT_COPY.emptyTitle}
    </Title>
    <Flex wrap justify="center" gap={8} className="px-24">
      {questions.map((question) => (
        <SuggestionButton
          key={question}
          size="small"
          onClick={() => onPick(question)}
        >
          {question}
        </SuggestionButton>
      ))}
    </Flex>
  </Flex>
);

/**
 * The Overview for agents with a chat: a compact header, then one feed of the
 * agent's events and the conversation, the agent's activity, and the input.
 */
export const AgentChat = () => {
  const { selectedService, selectedAgentType } = useServices();
  const { isAgentActive } = useAgentActivity();
  const serviceConfigId = selectedService?.service_config_id;
  const deploymentStatus = selectedService?.deploymentStatus;

  // Stopped or never run: no input. Starting, stopping or down: the input is
  // shown but can't send, as the middleware only forwards while it runs.
  const isStopped = !isActiveDeploymentStatus(deploymentStatus);
  const canSend = isAgentActive;

  const [text, setText] = useState('');
  const feed = useAgentFeed(serviceConfigId);
  const chat = useAgentChat({ serviceConfigId, isAgentStopped: isStopped });
  const { shouldShowCostNote, markCostNoteSeen } = useChatCostNote(
    selectedAgentType,
    serviceConfigId,
  );

  const items = useMemo(() => {
    const allItems = buildFeedItems(feed.entries, chat.localMessages);
    return chat.isMessagesOnly
      ? allItems.filter(({ entry }) => entry.kind === 'message')
      : allItems;
  }, [chat.isMessagesOnly, chat.localMessages, feed.entries]);

  return (
    <Flex vertical gap={24}>
      <AgentChatHeader />
      <ChatCard $noBorder>
        <Flex vertical className="h-full">
          <Feed
            items={items}
            isLoading={feed.isLoading}
            isError={feed.isError}
            hasOlder={feed.hasOlder}
            isFetchingOlder={feed.isFetchingOlder}
            isFetchOlderError={feed.isFetchOlderError}
            fetchOlder={feed.fetchOlder}
            emptyState={
              <EmptyState
                questions={SUGGESTED_QUESTIONS[selectedAgentType] ?? []}
                onPick={setText}
              />
            }
            onRetry={chat.retry}
            onDismiss={chat.dismiss}
          />
          <LoaderRow
            isPending={chat.isPending}
            isStillThinking={chat.isStillThinking}
            isMessagesOnly={chat.isMessagesOnly}
          />
          {isStopped ? (
            <Flex justify="center" className="py-24">
              <Text className="text-neutral-tertiary">
                {CHAT_COPY.startToChat}
              </Text>
            </Flex>
          ) : (
            <ChatInput
              text={text}
              onTextChange={setText}
              onSend={() => chat.send(text.trim())}
              canSend={canSend}
              isMessagesOnly={chat.isMessagesOnly}
              onMessagesOnlyChange={chat.setMessagesOnly}
              isBusyNoticeOpen={chat.isBusyNoticeOpen}
              onBusyNoticeClose={chat.closeBusyNotice}
              shouldShowCostNote={shouldShowCostNote}
              onCostNoteSeen={markCostNoteSeen}
            />
          )}
        </Flex>
      </ChatCard>
    </Flex>
  );
};
