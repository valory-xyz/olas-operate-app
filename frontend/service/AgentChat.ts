import { z } from 'zod';

import { BACKEND_URL_V2, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import {
  ChatReply,
  ChatRequest,
  FeedAgentMessageEntry,
  FeedEntry,
  FeedUserMessageEntry,
  LoadedFeedPage,
} from '@/types/AgentChat';

const FeedLineSchema = z.object({
  id: z.number().int(),
  ts: z.number(),
});

const FeedUserMessageEntrySchema: z.ZodType<FeedUserMessageEntry> =
  FeedLineSchema.extend({
    kind: z.literal('message'),
    role: z.literal('user'),
    text: z.string(),
    client_id: z.string(),
  });

const FeedAgentMessageEntrySchema: z.ZodType<FeedAgentMessageEntry> =
  FeedLineSchema.extend({
    kind: z.literal('message'),
    role: z.literal('agent'),
    text: z.string(),
    client_id: z.string().optional(),
  });

const FeedEntrySchema: z.ZodType<FeedEntry> = z.union([
  FeedUserMessageEntrySchema,
  FeedAgentMessageEntrySchema,
  FeedLineSchema.extend({
    kind: z.literal('event'),
    title: z.string(),
    fields: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        url: z.string().optional(),
      }),
    ),
  }),
]);

/** The middleware only serves lines with an integer `id`. */
const FeedPageSchema = z.object({
  entries: z.array(z.object({ id: z.number().int() }).passthrough()),
  has_more: z.boolean(),
});

const ChatReplySchema: z.ZodType<ChatReply> = z.object({
  message: FeedUserMessageEntrySchema,
  reply: FeedAgentMessageEntrySchema,
});

/** A failed chat request. `status` is the HTTP status, if there was a response. */
export class AgentChatError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AgentChatError';
  }
}

const parseErrorField = (text: string): unknown => {
  try {
    return JSON.parse(text)?.error;
  } catch {
    return undefined;
  }
};

const readErrorMessage = async (response: Response, fallback: string) => {
  const text = await response.text();
  const error = parseErrorField(text);
  return typeof error === 'string' ? error : text.trim() || fallback;
};

/** Feed ids are per service, so a dropped line is keyed by both. */
const loggedDroppedLines = new Set<string>();

/**
 * One page of the agent's feed, oldest → newest. Omit `before` for the newest
 * page. Lines that don't match the feed contract are dropped and logged; a
 * page that doesn't is an error.
 */
const getAgentFeed = async (
  serviceConfigId: string,
  { before, limit }: { before?: number; limit?: number },
): Promise<LoadedFeedPage> => {
  const params = new URLSearchParams();
  if (before !== undefined) params.set('before', String(before));
  if (limit !== undefined) params.set('limit', String(limit));
  const query = params.toString();

  const response = await fetch(
    `${BACKEND_URL_V2}/service/${serviceConfigId}/feed${query ? `?${query}` : ''}`,
    { method: 'GET', headers: { ...CONTENT_TYPE_JSON_UTF8 } },
  );
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, 'Failed to fetch agent feed'),
    );
  }

  const page = FeedPageSchema.safeParse(await response.json());
  if (!page.success) {
    throw new Error(`Unexpected agent feed page: ${page.error.message}`);
  }

  const entries = page.data.entries.flatMap((entry) => {
    const parsed = FeedEntrySchema.safeParse(entry);
    if (parsed.success) return [parsed.data];
    const lineKey = `${serviceConfigId}:${entry.id}`;
    if (!loggedDroppedLines.has(lineKey)) {
      loggedDroppedLines.add(lineKey);
      console.error(
        `Dropped agent feed line ${entry.id}:`,
        parsed.error.issues,
      );
    }
    return [];
  });
  return {
    entries,
    has_more: page.data.has_more,
    oldestId: page.data.entries[0]?.id,
    newestId: page.data.entries.at(-1)?.id,
  };
};

/**
 * Sends a chat message to the running agent and waits for its reply.
 * Throws an `AgentChatError` on failure.
 */
const sendAgentChat = async (
  serviceConfigId: string,
  body: ChatRequest,
): Promise<ChatReply> => {
  let response: Response;
  try {
    response = await fetch(
      `${BACKEND_URL_V2}/service/${serviceConfigId}/chat`,
      {
        method: 'POST',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        body: JSON.stringify(body),
      },
    );
  } catch {
    throw new AgentChatError('Failed to reach the agent chat');
  }

  if (!response.ok) {
    throw new AgentChatError(
      await readErrorMessage(response, 'Failed to chat with the agent'),
      response.status,
    );
  }

  const reply = ChatReplySchema.safeParse(await response.json());
  if (!reply.success) {
    throw new AgentChatError('Unexpected agent chat reply', response.status);
  }
  return reply.data;
};

export const AgentChatService = {
  getAgentFeed,
  sendAgentChat,
};
