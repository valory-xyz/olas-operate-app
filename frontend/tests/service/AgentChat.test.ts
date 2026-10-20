import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL_V2 } from '../../constants/urls';
import { AgentChatError, AgentChatService } from '../../service/AgentChat';
import { FeedPage } from '../../types/AgentChat';
import {
  makeChatReply,
  makeFeedEvent,
  makeFeedUserMessage,
} from '../helpers/factories';

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

const mockTextResponse = (text: string, status: number) =>
  Promise.resolve({
    ok: false,
    status,
    json: () => Promise.reject(new SyntaxError('Unexpected token')),
    text: () => Promise.resolve(text),
  } as Response);

const FEED_PAGE: FeedPage = {
  entries: [
    makeFeedEvent(7, {
      fields: [{ label: 'Market', value: 'Will it rain?', url: 'https://x' }],
    }),
  ],
  has_more: true,
};

const CHAT_REPLY = makeChatReply();

const sendHi = () =>
  AgentChatService.sendAgentChat(SERVICE_CONFIG_ID, {
    text: 'Hi',
    client_id: 'client-1',
  });

describe('AgentChatService', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      expect(page).toEqual({ ...FEED_PAGE, oldestId: 7 });
    });

    it('passes the before cursor for older pages', async () => {
      mockFetch.mockReturnValue(mockResponse(FEED_PAGE));

      await AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {
        before: 42,
        limit: 20,
      });

      expect(mockFetch.mock.calls[0][0]).toBe(`${FEED_URL}?before=42&limit=20`);
    });

    describe('lines that do not match the feed entry contract', () => {
      const validMessage = makeFeedUserMessage(5);
      const DROPPED_LINES = [
        { id: 1, ts: 1, kind: 'event', title: 'No fields' },
        { id: 2, ts: 2, kind: 'message', role: 'system', text: 'x' },
        { id: 3, kind: 'message', role: 'user', text: 'no ts' },
        { id: 4, ts: 4, kind: 'message', role: 'user', text: 'no client_id' },
      ];

      beforeEach(() => {
        mockFetch.mockReturnValue(
          mockResponse({
            entries: [...DROPPED_LINES, validMessage],
            has_more: true,
          }),
        );
      });

      it('are dropped', async () => {
        const page = await AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {});

        expect(page.entries).toEqual([validMessage]);
      });

      it('are logged with their id and what did not match', async () => {
        await AgentChatService.getAgentFeed('sc-logged', {});

        expect(console.error).toHaveBeenCalledTimes(DROPPED_LINES.length);
        expect(console.error).toHaveBeenCalledWith(
          'Dropped agent feed line 4:',
          [expect.objectContaining({ code: 'invalid_union' })],
        );
      });

      it('are logged once, not on every poll that returns them again', async () => {
        await AgentChatService.getAgentFeed('sc-polled', {});
        await AgentChatService.getAgentFeed('sc-polled', {});

        expect(console.error).toHaveBeenCalledTimes(DROPPED_LINES.length);
      });

      it("are logged again for another agent's feed with the same ids", async () => {
        await AgentChatService.getAgentFeed('sc-agent-a', {});
        await AgentChatService.getAgentFeed('sc-agent-b', {});

        expect(console.error).toHaveBeenCalledTimes(2 * DROPPED_LINES.length);
      });

      it('still count for the cursor of the next older page', async () => {
        const page = await AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {});

        expect(page.oldestId).toBe(1);
      });
    });

    it('keeps the cursor when every line on the page was dropped', async () => {
      mockFetch.mockReturnValue(
        mockResponse({
          entries: [{ id: 40, ts: 40, kind: 'unknown' }],
          has_more: true,
        }),
      );

      const page = await AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {});

      expect(page).toEqual({ entries: [], has_more: true, oldestId: 40 });
    });

    it.each([
      ['no has_more', { entries: [] }],
      ['no entries', { has_more: false }],
      [
        'an entry without an integer id',
        { entries: [{ id: 'x' }], has_more: false },
      ],
      ['not an object', 'oops'],
    ])('throws on a page with %s', async (_, body) => {
      mockFetch.mockReturnValue(mockResponse(body));

      await expect(
        AgentChatService.getAgentFeed(SERVICE_CONFIG_ID, {}),
      ).rejects.toThrow('Unexpected agent feed page');
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

      const reply = await sendHi();

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

        const error = await sendHi().catch((e: unknown) => e);

        expect(error).toBeInstanceOf(AgentChatError);
        expect((error as AgentChatError).status).toBe(status);
      },
    );

    it('throws an AgentChatError without a status when the request fails', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const error = await sendHi().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AgentChatError);
      expect((error as AgentChatError).status).toBeUndefined();
    });

    it('treats a 200 without both lines as a failure', async () => {
      mockFetch.mockReturnValue(mockResponse({ reasoning: 'old agent' }));

      await expect(sendHi()).rejects.toBeInstanceOf(AgentChatError);
    });

    describe('error message', () => {
      it('uses the error text the middleware sent', async () => {
        mockFetch.mockReturnValue(
          mockResponse({ error: 'The agent did not reply in time.' }, 504),
        );

        await expect(sendHi()).rejects.toThrow(
          'The agent did not reply in time.',
        );
      });

      it('falls back to the raw body when error is not a string', async () => {
        mockFetch.mockReturnValue(
          mockResponse({ error: { detail: 'bad' } }, 500),
        );

        await expect(sendHi()).rejects.toThrow('{"error":{"detail":"bad"}}');
      });

      it('falls back to the raw body when it is not JSON', async () => {
        mockFetch.mockReturnValue(mockTextResponse('Bad Gateway', 502));

        await expect(sendHi()).rejects.toThrow('Bad Gateway');
      });

      it('falls back to a generic message when the body is empty', async () => {
        mockFetch.mockReturnValue(mockTextResponse('', 502));

        await expect(sendHi()).rejects.toThrow('Failed to chat with the agent');
      });
    });
  });
});
