import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL_V2 } from '../../constants/urls';
import { AgentChatError, AgentChatService } from '../../service/AgentChat';
import { ChatReply, FeedPage } from '../../types/AgentChat';

const SERVICE_CONFIG_ID = 'sc-123';
const FEED_URL = `${BACKEND_URL_V2}/service/${SERVICE_CONFIG_ID}/feed`;
const CHAT_URL = `${BACKEND_URL_V2}/service/${SERVICE_CONFIG_ID}/chat`;

const mockResponse = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

const FEED_PAGE: FeedPage = {
  entries: [
    {
      id: 7,
      ts: 1_760_000_000,
      kind: 'event',
      type: 'trade_placed',
      title: 'Placed a trade',
      fields: [{ label: 'Market', value: 'Will it rain?', url: 'https://x' }],
    },
  ],
  has_more: true,
};

const CHAT_REPLY: ChatReply = {
  message: {
    id: 8,
    ts: 1_760_000_010,
    kind: 'message',
    role: 'user',
    text: 'Hi',
    client_id: 'client-1',
  },
  reply: {
    id: 9,
    ts: 1_760_000_020,
    kind: 'message',
    role: 'agent',
    text: 'Hello',
    client_id: 'client-1',
  },
};

describe('AgentChatService', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  describe('getAgentFeed', () => {
    it('requests the newest page when no cursor is given', async () => {
      mockFetch.mockReturnValue(mockResponse(FEED_PAGE));

      const page = await AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {
        limit: 20,
      });

      expect(mockFetch).toHaveBeenCalledWith(`${FEED_URL}?limit=20`, {
        method: 'GET',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
      });
      expect(page).toEqual(FEED_PAGE);
    });

    it('passes the before cursor for older pages', async () => {
      mockFetch.mockReturnValue(mockResponse(FEED_PAGE));

      await AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {
        before: 42,
        limit: 20,
      });

      expect(mockFetch.mock.calls[0][0]).toBe(`${FEED_URL}?before=42&limit=20`);
    });

    it('drops lines that do not match the feed entry contract', async () => {
      const validMessage = CHAT_REPLY.message;
      mockFetch.mockReturnValue(
        mockResponse({
          entries: [
            { id: 1, ts: 1, kind: 'event', title: 'No fields' },
            { id: 2, ts: 2, kind: 'message', role: 'system', text: 'x' },
            { id: 3, kind: 'message', role: 'user', text: 'no ts' },
            validMessage,
          ],
          has_more: false,
        }),
      );

      const page = await AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {});

      expect(page.entries).toEqual([validMessage]);
    });

    it('throws on a non-2xx response', async () => {
      mockFetch.mockReturnValue(mockResponse({ error: 'not found' }, 404));

      await expect(
        AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {}),
      ).rejects.toThrow('not found');
    });
  });

  describe('sendAgentChat', () => {
    it('posts the text and client_id and returns the written lines', async () => {
      mockFetch.mockReturnValue(mockResponse(CHAT_REPLY));

      const reply = await AgentChatService.sendAgentChat(SERVICE_CONFIG_ID, {
        text: 'Hi',
        client_id: 'client-1',
      });

      expect(mockFetch).toHaveBeenCalledWith(CHAT_URL, {
        method: 'POST',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        body: JSON.stringify({ text: 'Hi', client_id: 'client-1' }),
      });
      expect(reply).toEqual(CHAT_REPLY);
    });

    it.each([402, 409, 503, 504, 500])(
      'throws an AgentChatError carrying the %s status',
      async (status) => {
        mockFetch.mockReturnValue(mockResponse({ error: 'nope' }, status));

        const error = await AgentChatService.sendAgentChat(SERVICE_CONFIG_ID, {
          text: 'Hi',
          client_id: 'client-1',
        }).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AgentChatError);
        expect((error as AgentChatError).status).toBe(status);
      },
    );

    it('throws an AgentChatError without a status when the request fails', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const error = await AgentChatService.sendAgentChat(SERVICE_CONFIG_ID, {
        text: 'Hi',
        client_id: 'client-1',
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AgentChatError);
      expect((error as AgentChatError).status).toBeUndefined();
    });

    it('treats a 200 without both lines as a failure', async () => {
      mockFetch.mockReturnValue(mockResponse({ reasoning: 'old agent' }));

      await expect(
        AgentChatService.sendAgentChat(SERVICE_CONFIG_ID, {
          text: 'Hi',
          client_id: 'client-1',
        }),
      ).rejects.toBeInstanceOf(AgentChatError);
    });
  });
});
