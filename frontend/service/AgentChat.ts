import { z } from 'zod';

import { BACKEND_URL_V2, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import {
  ChatReply,
  ChatRequest,
  FeedEntry,
  FeedMessageEntry,
  FeedPage,
} from '@/types/AgentChat';

const FeedMessageEntrySchema: z.ZodType<FeedMessageEntry> = z.object({
  id: z.number().int(),
  ts: z.number(),
  kind: z.literal('message'),
  role: z.enum(['user', 'agent']),
  text: z.string(),
  client_id: z.string().optional(),
});

const FeedEntrySchema: z.ZodType<FeedEntry> = z.union([
  FeedMessageEntrySchema,
  z.object({
    id: z.number().int(),
    ts: z.number(),
    kind: z.literal('event'),
    type: z.string(),
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

const ChatReplySchema: z.ZodType<ChatReply> = z.object({
  message: FeedMessageEntrySchema,
  reply: FeedMessageEntrySchema,
});

/**
 * A failed chat request. `status` is the HTTP status, or `undefined` when the
 * middleware could not be reached.
 */
export class AgentChatError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AgentChatError';
  }
}

const readErrorMessage = async (response: Response, fallback: string) => {
  const text = await response.text();
  try {
    return JSON.parse(text)?.error ?? fallback;
  } catch {
    return fallback;
  }
};

/**
 * One page of the agent's feed, oldest → newest. Omit `before` for the newest
 * page. Lines that don't match the feed contract are dropped.
 */
const getAgentFeed = async (
  serviceConfigId: string,
  { before, limit }: { before?: number; limit?: number },
): Promise<FeedPage> => {
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

  const page: { entries?: unknown[]; has_more?: boolean } =
    await response.json();
  const entries = (page.entries ?? []).flatMap((entry) => {
    const parsed = FeedEntrySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
  return { entries, has_more: page.has_more === true };
};

/**
 * Sends a chat message to the running agent and waits for its reply.
 * Throws an `AgentChatError` carrying the HTTP status on failure.
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
