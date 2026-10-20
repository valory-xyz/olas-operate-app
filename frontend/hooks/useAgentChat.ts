import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { REACT_QUERY_KEYS, THIRTY_SECONDS_INTERVAL } from '@/constants';
import { AgentChatError, AgentChatService } from '@/service/AgentChat';
import { ChatReply } from '@/types/AgentChat';
import { Maybe } from '@/types/Util';
import {
  chatFailureFromStatus,
  FeedData,
  LocalChatMessage,
  mergeIntoNewestPage,
} from '@/utils/agentChat';

export const BUSY_NOTICE_DURATION_MS = 5_000;

/**
 * Chat state that lives for the app session, per service. Kept in the query
 * cache so it survives leaving the Overview and a reply landing after that.
 */
type ChatSession = {
  messages: LocalChatMessage[];
  /**
   * `auto`: off until the next send turns it on. `off-by-user`: sending no
   * longer turns it on until the agent stops.
   */
  messagesOnly: 'auto' | 'on' | 'off-by-user';
};

const EMPTY_SESSION: ChatSession = { messages: [], messagesOnly: 'auto' };

type UseAgentChatParams = {
  serviceConfigId: Maybe<string>;
  /**
   * Stopped or never run, i.e. not deploying, deployed or stopping. Resets
   * Messages only.
   */
  isAgentStopped: boolean;
};

/**
 * Sends chat messages and tracks their replies, failures and the Messages
 * only filter. Only one reply can be pending at a time.
 */
export const useAgentChat = ({
  serviceConfigId,
  isAgentStopped,
}: UseAgentChatParams) => {
  const queryClient = useQueryClient();
  const [isBusyNoticeOpen, setIsBusyNoticeOpen] = useState(false);
  const [isStillThinking, setIsStillThinking] = useState(false);

  const { data: session } = useQuery<ChatSession>({
    queryKey: REACT_QUERY_KEYS.AGENT_CHAT_SESSION_KEY(serviceConfigId),
    // Never fetched: written by the callbacks below.
    queryFn: () => EMPTY_SESSION,
    enabled: false,
    initialData: EMPTY_SESSION,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const updateSession = useCallback(
    (id: string, update: (session: ChatSession) => ChatSession) =>
      queryClient.setQueryData<ChatSession>(
        REACT_QUERY_KEYS.AGENT_CHAT_SESSION_KEY(id),
        (previous = EMPTY_SESSION) => update(previous),
      ),
    [queryClient],
  );

  const pendingMessage = session.messages.find(
    ({ state }) => state === 'pending',
  );
  const pendingSentAt = pendingMessage?.sentAt;

  useEffect(() => {
    setIsStillThinking(false);
    if (pendingSentAt === undefined) return;
    const timeout = setTimeout(
      () => setIsStillThinking(true),
      Math.max(0, pendingSentAt + THIRTY_SECONDS_INTERVAL - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [pendingSentAt]);

  useEffect(() => {
    if (!isBusyNoticeOpen) return;
    const timeout = setTimeout(
      () => setIsBusyNoticeOpen(false),
      BUSY_NOTICE_DURATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [isBusyNoticeOpen]);

  useEffect(() => {
    if (!isAgentStopped || !serviceConfigId) return;
    updateSession(serviceConfigId, (previous) =>
      previous.messagesOnly === 'auto'
        ? previous
        : { ...previous, messagesOnly: 'auto' },
    );
  }, [isAgentStopped, serviceConfigId, updateSession]);

  const setMessageState = useCallback(
    (id: string, clientId: string, state: LocalChatMessage['state']) =>
      updateSession(id, (previous) => ({
        ...previous,
        messages: previous.messages.map((message) =>
          message.client_id === clientId
            ? { ...message, state, sentAt: Date.now() }
            : message,
        ),
      })),
    [updateSession],
  );

  const removeMessage = useCallback(
    (id: string, clientId: string) =>
      updateSession(id, (previous) => ({
        ...previous,
        messages: previous.messages.filter(
          (local) => local.client_id !== clientId,
        ),
      })),
    [updateSession],
  );

  const post = useCallback(
    async (id: string, clientId: string, text: string) => {
      let chatReply: ChatReply;
      try {
        chatReply = await AgentChatService.sendAgentChat(id, {
          text,
          client_id: clientId,
        });
      } catch (error) {
        console.error(`Agent chat failed for client_id ${clientId}:`, error);
        const failure = chatFailureFromStatus(
          error instanceof AgentChatError ? error.status : undefined,
        );
        // 409: the agent is still answering this client_id from an earlier
        // attempt, so the message keeps its failed state.
        if (failure === 'busy') setIsBusyNoticeOpen(true);
        setMessageState(id, clientId, failure === 'busy' ? 'failed' : failure);
        return;
      }

      const feedKey = REACT_QUERY_KEYS.AGENT_FEED_KEY(id);
      // Until the feed's first page loads there is nothing to merge into, so
      // the local message stays until the feed shows its user line.
      if (!queryClient.getQueryData<FeedData>(feedKey)?.pages.length) {
        setMessageState(id, clientId, 'sent');
        return;
      }
      queryClient.setQueryData<FeedData>(feedKey, (data) =>
        mergeIntoNewestPage(data, {
          entries: [chatReply.message, chatReply.reply],
          has_more: false,
        }),
      );
      removeMessage(id, clientId);
    },
    [queryClient, removeMessage, setMessageState],
  );

  /** Returns whether the message was queued, so the input can be cleared. */
  const send = useCallback(
    (text: string) => {
      if (!serviceConfigId) return false;
      if (pendingMessage) {
        setIsBusyNoticeOpen(true);
        return false;
      }
      const clientId = crypto.randomUUID();
      const now = Date.now();
      updateSession(serviceConfigId, (previous) => ({
        ...previous,
        messages: [
          ...previous.messages,
          {
            client_id: clientId,
            text,
            ts: Math.floor(now / 1000),
            sentAt: now,
            state: 'pending',
          },
        ],
        messagesOnly:
          previous.messagesOnly === 'auto' ? 'on' : previous.messagesOnly,
      }));
      post(serviceConfigId, clientId, text);
      return true;
    },
    [pendingMessage, post, serviceConfigId, updateSession],
  );

  /** Resends a failed message with the same `client_id`. */
  const retry = useCallback(
    (clientId: string) => {
      if (!serviceConfigId) return;
      if (pendingMessage) {
        setIsBusyNoticeOpen(true);
        return;
      }
      const message = session.messages.find(
        (local) => local.client_id === clientId,
      );
      if (!message) return;
      setMessageState(serviceConfigId, clientId, 'pending');
      post(serviceConfigId, clientId, message.text);
    },
    [pendingMessage, post, serviceConfigId, session.messages, setMessageState],
  );

  /** Drops a failed message's session state. A line the agent wrote stays. */
  const dismiss = useCallback(
    (clientId: string) => {
      if (!serviceConfigId) return;
      removeMessage(serviceConfigId, clientId);
    },
    [removeMessage, serviceConfigId],
  );

  const setMessagesOnly = useCallback(
    (isOn: boolean) => {
      if (!serviceConfigId) return;
      updateSession(serviceConfigId, (previous) => ({
        ...previous,
        messagesOnly: isOn ? 'on' : 'off-by-user',
      }));
    },
    [serviceConfigId, updateSession],
  );

  return {
    localMessages: session.messages,
    isPending: !!pendingMessage,
    isStillThinking: !!pendingMessage && isStillThinking,
    isBusyNoticeOpen,
    closeBusyNotice: () => setIsBusyNoticeOpen(false),
    isMessagesOnly: session.messagesOnly === 'on',
    setMessagesOnly,
    send,
    retry,
    dismiss,
  };
};
