import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren } from 'react';

import { REACT_QUERY_KEYS } from '../../constants/reactQueryKeys';
import {
  BUSY_NOTICE_DURATION_MS,
  useAgentChat,
} from '../../hooks/useAgentChat';
import { AgentChatError, AgentChatService } from '../../service/AgentChat';
import { ChatReply, LoadedFeedPage } from '../../types/AgentChat';
import { Maybe } from '../../types/Util';
import { FeedData } from '../../utils/agentChat';
import { makeChatReply } from '../helpers/factories';

jest.mock('../../service/AgentChat', () => ({
  ...jest.requireActual('../../service/AgentChat'),
  AgentChatService: { sendAgentChat: jest.fn() },
}));

const mockSendAgentChat = AgentChatService.sendAgentChat as jest.Mock;

const SERVICE_CONFIG_ID = 'sc-1';
const OTHER_SERVICE_CONFIG_ID = 'sc-2';
const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CLIENT_ID = '22222222-2222-4222-8222-222222222222';

const FEED_PAGE: LoadedFeedPage = { entries: [], has_more: false };

/** A promise the test resolves or rejects when it wants the reply to land. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

type ChatProps = { serviceConfigId: Maybe<string>; isAgentStopped: boolean };

const renderChat = (
  initialProps: ChatProps = {
    serviceConfigId: SERVICE_CONFIG_ID,
    isAgentStopped: false,
  },
  queryClient: QueryClient = createQueryClient(),
) => {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  const hook = renderHook((props: ChatProps) => useAgentChat(props), {
    wrapper,
    initialProps,
  });
  return { ...hook, queryClient };
};

const loadFeed = (queryClient: QueryClient, serviceConfigId: string) =>
  queryClient.setQueryData<FeedData>(
    REACT_QUERY_KEYS.AGENT_FEED_KEY(serviceConfigId),
    { pages: [FEED_PAGE], pageParams: [undefined] },
  );

const feedEntries = (queryClient: QueryClient, serviceConfigId: string) =>
  queryClient.getQueryData<FeedData>(
    REACT_QUERY_KEYS.AGENT_FEED_KEY(serviceConfigId),
  )?.pages[0].entries;

const failWith = (status?: number) =>
  mockSendAgentChat.mockRejectedValueOnce(new AgentChatError('nope', status));

describe('useAgentChat', () => {
  // Deliver React Query notifications synchronously, inside `act`.
  beforeAll(() => notifyManager.setScheduler((callback) => callback()));
  afterAll(() =>
    notifyManager.setScheduler((callback) => setTimeout(callback, 0)),
  );

  beforeEach(() => {
    mockSendAgentChat.mockReset();
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(CLIENT_ID);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('sending', () => {
    it('keeps the message pending with a generated client_id while the request is open', async () => {
      mockSendAgentChat.mockReturnValue(new Promise(() => {}));
      const { result } = renderChat();

      await act(async () => {
        result.current.send('Why?');
      });

      expect(mockSendAgentChat).toHaveBeenCalledWith(SERVICE_CONFIG_ID, {
        text: 'Why?',
        client_id: CLIENT_ID,
      });
      expect(result.current.isPending).toBe(true);
      expect(result.current.localMessages).toMatchObject([
        { client_id: CLIENT_ID, text: 'Why?', state: 'pending' },
      ]);
    });

    it('replaces the local message with the written lines on 200', async () => {
      const reply = makeChatReply(CLIENT_ID);
      mockSendAgentChat.mockResolvedValue(reply);
      const queryClient = createQueryClient();
      loadFeed(queryClient, SERVICE_CONFIG_ID);
      const { result } = renderChat(undefined, queryClient);

      await act(async () => {
        result.current.send('Why?');
      });

      expect(result.current.localMessages).toEqual([]);
      expect(result.current.isPending).toBe(false);
      expect(feedEntries(queryClient, SERVICE_CONFIG_ID)).toEqual([
        reply.message,
        reply.reply,
      ]);
    });

    it('keeps the message, no longer pending, on 200 before the feed has loaded', async () => {
      mockSendAgentChat.mockResolvedValue(makeChatReply(CLIENT_ID));
      const { result, queryClient } = renderChat();

      await act(async () => {
        result.current.send('Why?');
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.localMessages).toMatchObject([
        { client_id: CLIENT_ID, text: 'Why?', state: 'sent' },
      ]);
      expect(
        queryClient.getQueryData(
          REACT_QUERY_KEYS.AGENT_FEED_KEY(SERVICE_CONFIG_ID),
        ),
      ).toBeUndefined();
    });

    it('keeps an answered message as sent, not failed, when the feed merge throws', async () => {
      mockSendAgentChat.mockResolvedValue(makeChatReply(CLIENT_ID));
      const queryClient = createQueryClient();
      queryClient.setQueryData(
        REACT_QUERY_KEYS.AGENT_FEED_KEY(SERVICE_CONFIG_ID),
        {
          pages: [{ entries: null, has_more: false }],
          pageParams: [undefined],
        },
      );
      const { result } = renderChat(undefined, queryClient);

      await act(async () => {
        result.current.send('Why?');
      });

      expect(result.current.localMessages).toMatchObject([
        { client_id: CLIENT_ID, state: 'sent' },
      ]);
      expect(result.current.isPending).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('not merged'),
        expect.any(TypeError),
      );
    });

    it('shows Still thinking after 30 seconds of waiting', () => {
      jest.useFakeTimers();
      mockSendAgentChat.mockReturnValue(new Promise(() => {}));
      const { result } = renderChat();

      act(() => {
        result.current.send('Why?');
      });
      act(() => {
        jest.advanceTimersByTime(29_000);
      });
      expect(result.current.isStillThinking).toBe(false);

      act(() => {
        jest.advanceTimersByTime(1_000);
      });
      expect(result.current.isStillThinking).toBe(true);
      jest.useRealTimers();
    });

    it('closes the busy notice on its own after a few seconds', () => {
      jest.useFakeTimers();
      mockSendAgentChat.mockReturnValue(new Promise(() => {}));
      const { result } = renderChat();
      act(() => {
        result.current.send('Why?');
      });
      act(() => {
        result.current.send('And the risks?');
      });
      expect(result.current.isBusyNoticeOpen).toBe(true);

      act(() => {
        jest.advanceTimersByTime(BUSY_NOTICE_DURATION_MS - 1);
      });
      expect(result.current.isBusyNoticeOpen).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.isBusyNoticeOpen).toBe(false);
      jest.useRealTimers();
    });

    it('does not send while a reply is pending and shows the busy notice', async () => {
      mockSendAgentChat.mockReturnValue(new Promise(() => {}));
      const { result } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });

      let wasSent = true;
      await act(async () => {
        wasSent = result.current.send('And the risks?');
      });

      expect(wasSent).toBe(false);
      expect(mockSendAgentChat).toHaveBeenCalledTimes(1);
      expect(result.current.isBusyNoticeOpen).toBe(true);
    });
  });

  describe('failures', () => {
    it.each([
      [402, 'no-funds'],
      [504, 'failed'],
      [503, 'failed'],
      [500, 'failed'],
      [undefined, 'failed'],
    ] as const)('marks the message %s as %s', async (status, state) => {
      failWith(status);
      const { result } = renderChat();

      await act(async () => {
        result.current.send('Why?');
      });

      expect(result.current.localMessages[0].state).toBe(state);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isBusyNoticeOpen).toBe(false);
    });

    it('logs the failure with its client_id', async () => {
      const error = new AgentChatError('timeout', 504);
      mockSendAgentChat.mockRejectedValueOnce(error);
      const { result } = renderChat();

      await act(async () => {
        result.current.send('Why?');
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(CLIENT_ID),
        error,
      );
    });

    it('resends the same client_id on Try again and clears the message on 200', async () => {
      failWith(504);
      const queryClient = createQueryClient();
      loadFeed(queryClient, SERVICE_CONFIG_ID);
      const { result } = renderChat(undefined, queryClient);
      await act(async () => {
        result.current.send('Why?');
      });

      const resend = deferred<ChatReply>();
      mockSendAgentChat.mockReturnValueOnce(resend.promise);
      await act(async () => {
        result.current.retry(CLIENT_ID);
      });

      expect(mockSendAgentChat).toHaveBeenLastCalledWith(SERVICE_CONFIG_ID, {
        text: 'Why?',
        client_id: CLIENT_ID,
      });
      expect(result.current.localMessages[0].state).toBe('pending');

      await act(async () => {
        resend.resolve(makeChatReply(CLIENT_ID));
      });
      expect(result.current.localMessages).toEqual([]);
    });

    it('keeps the failed state and shows the busy notice on 409 from Try again', async () => {
      failWith(504);
      const { result } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });

      failWith(409);
      await act(async () => {
        result.current.retry(CLIENT_ID);
      });

      expect(result.current.localMessages[0].state).toBe('failed');
      expect(result.current.isBusyNoticeOpen).toBe(true);
    });

    it('drops the session message on Dismiss, so the next send starts clean', async () => {
      failWith(402);
      const { result } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });

      await act(async () => {
        result.current.dismiss(CLIENT_ID);
      });
      expect(result.current.localMessages).toEqual([]);

      mockSendAgentChat.mockReturnValue(new Promise(() => {}));
      await act(async () => {
        result.current.send('Again');
      });
      expect(result.current.localMessages).toMatchObject([
        { text: 'Again', state: 'pending' },
      ]);
    });
  });

  describe('Try again and Dismiss', () => {
    it('does not resend while another message is pending and shows the busy notice', async () => {
      failWith(504);
      const { result } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });

      jest.spyOn(crypto, 'randomUUID').mockReturnValue(OTHER_CLIENT_ID);
      mockSendAgentChat.mockReturnValue(new Promise(() => {}));
      await act(async () => {
        result.current.send('And the risks?');
      });
      await act(async () => {
        result.current.retry(CLIENT_ID);
      });

      expect(mockSendAgentChat).toHaveBeenCalledTimes(2);
      expect(result.current.isBusyNoticeOpen).toBe(true);
      expect(result.current.localMessages).toMatchObject([
        { client_id: CLIENT_ID, state: 'failed' },
        { client_id: OTHER_CLIENT_ID, state: 'pending' },
      ]);
    });

    it('does nothing on Try again after the message was dismissed', async () => {
      failWith(504);
      const { result } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });
      await act(async () => {
        result.current.dismiss(CLIENT_ID);
      });

      await act(async () => {
        result.current.retry(CLIENT_ID);
      });

      expect(mockSendAgentChat).toHaveBeenCalledTimes(1);
      expect(result.current.localMessages).toEqual([]);
      expect(result.current.isPending).toBe(false);
    });

    it('ends failed and no longer pending when Try again also times out', async () => {
      failWith(504);
      const { result } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });

      failWith(504);
      await act(async () => {
        result.current.retry(CLIENT_ID);
      });

      expect(mockSendAgentChat).toHaveBeenCalledTimes(2);
      expect(result.current.localMessages).toMatchObject([
        { client_id: CLIENT_ID, state: 'failed' },
      ]);
      expect(result.current.isPending).toBe(false);
    });

    it('keeps the message as sent when Try again succeeds before the feed has loaded', async () => {
      failWith(504);
      const { result, queryClient } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });

      mockSendAgentChat.mockResolvedValueOnce(makeChatReply(CLIENT_ID));
      await act(async () => {
        result.current.retry(CLIENT_ID);
      });

      expect(result.current.localMessages).toMatchObject([
        { client_id: CLIENT_ID, state: 'sent' },
      ]);
      expect(result.current.isPending).toBe(false);
      expect(feedEntries(queryClient, SERVICE_CONFIG_ID)).toBeUndefined();
    });
  });

  describe('switching agents', () => {
    it('files a reply that lands after the switch under the agent it was sent to', async () => {
      const pending = deferred<ChatReply>();
      mockSendAgentChat.mockReturnValueOnce(pending.promise);
      const queryClient = createQueryClient();
      loadFeed(queryClient, SERVICE_CONFIG_ID);
      loadFeed(queryClient, OTHER_SERVICE_CONFIG_ID);
      const { result, rerender } = renderChat(undefined, queryClient);
      await act(async () => {
        result.current.send('Why?');
      });

      rerender({
        serviceConfigId: OTHER_SERVICE_CONFIG_ID,
        isAgentStopped: false,
      });
      expect(result.current.localMessages).toEqual([]);
      expect(result.current.isPending).toBe(false);

      const reply = makeChatReply(CLIENT_ID);
      await act(async () => {
        pending.resolve(reply);
      });

      expect(feedEntries(queryClient, SERVICE_CONFIG_ID)).toEqual([
        reply.message,
        reply.reply,
      ]);
      expect(feedEntries(queryClient, OTHER_SERVICE_CONFIG_ID)).toEqual([]);
      expect(result.current.localMessages).toEqual([]);

      rerender({ serviceConfigId: SERVICE_CONFIG_ID, isAgentStopped: false });
      expect(result.current.localMessages).toEqual([]);
      expect(result.current.isPending).toBe(false);
    });

    it('marks a failure that lands after the switch on the agent it was sent to', async () => {
      const pending = deferred<ChatReply>();
      mockSendAgentChat.mockReturnValueOnce(pending.promise);
      const { result, rerender } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });

      rerender({
        serviceConfigId: OTHER_SERVICE_CONFIG_ID,
        isAgentStopped: false,
      });
      await act(async () => {
        pending.reject(new AgentChatError('timeout', 504));
      });
      expect(result.current.localMessages).toEqual([]);

      rerender({ serviceConfigId: SERVICE_CONFIG_ID, isAgentStopped: false });
      expect(result.current.localMessages).toMatchObject([
        { client_id: CLIENT_ID, state: 'failed' },
      ]);
    });
  });

  describe('Messages only', () => {
    it('turns on when the user sends', async () => {
      mockSendAgentChat.mockReturnValue(new Promise(() => {}));
      const { result } = renderChat();
      expect(result.current.isMessagesOnly).toBe(false);

      await act(async () => {
        result.current.send('Why?');
      });

      expect(result.current.isMessagesOnly).toBe(true);
    });

    it('stays off after the user turns it off, even when sending again', async () => {
      mockSendAgentChat.mockResolvedValue(makeChatReply(CLIENT_ID));
      const { result } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });

      await act(async () => {
        result.current.setMessagesOnly(false);
      });
      await act(async () => {
        result.current.send('Again');
      });

      expect(result.current.isMessagesOnly).toBe(false);
    });

    it('resets when the agent stops, so the next send turns it on again', async () => {
      mockSendAgentChat.mockResolvedValue(makeChatReply(CLIENT_ID));
      const { result, rerender } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });
      await act(async () => {
        result.current.setMessagesOnly(false);
      });

      await act(async () => {
        rerender({ serviceConfigId: SERVICE_CONFIG_ID, isAgentStopped: true });
      });
      await act(async () => {
        rerender({ serviceConfigId: SERVICE_CONFIG_ID, isAgentStopped: false });
      });
      await act(async () => {
        result.current.send('Again');
      });

      expect(result.current.isMessagesOnly).toBe(true);
    });

    it('turns off when the agent stops', async () => {
      mockSendAgentChat.mockReturnValue(new Promise(() => {}));
      const { result, rerender } = renderChat();
      await act(async () => {
        result.current.send('Why?');
      });
      expect(result.current.isMessagesOnly).toBe(true);

      rerender({ serviceConfigId: SERVICE_CONFIG_ID, isAgentStopped: true });

      await waitFor(() => expect(result.current.isMessagesOnly).toBe(false));
    });
  });

  it('keeps the session when the chat remounts', async () => {
    mockSendAgentChat.mockReturnValue(new Promise(() => {}));
    const queryClient = createQueryClient();
    const first = renderChat(undefined, queryClient);
    act(() => {
      first.result.current.send('Why?');
    });
    first.unmount();

    const second = renderChat(undefined, queryClient);

    expect(second.result.current.localMessages).toHaveLength(1);
    expect(second.result.current.isMessagesOnly).toBe(true);
  });
});
