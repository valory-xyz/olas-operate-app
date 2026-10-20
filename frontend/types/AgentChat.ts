/**
 * Agent feed and chat, served by the middleware's
 * `GET /api/v2/service/{id}/feed` and `POST /api/v2/service/{id}/chat`.
 * Each entry is one line of the agent's `feed.jsonl`.
 */

export type FeedEventField = {
  label: string;
  /** Display-ready, e.g. "$2.00 pUSD", "93%". */
  value: string;
  url?: string;
};

export type FeedEventEntry = {
  id: number;
  /** Unix seconds. */
  ts: number;
  kind: 'event';
  title: string;
  fields: FeedEventField[];
};

type FeedMessageLine = {
  id: number;
  /** Unix seconds. */
  ts: number;
  kind: 'message';
  text: string;
};

export type FeedUserMessageEntry = FeedMessageLine & {
  role: 'user';
  client_id: string;
};

export type FeedAgentMessageEntry = FeedMessageLine & {
  role: 'agent';
  /** The user line it answers; absent when the agent wrote unprompted. */
  client_id?: string;
};

export type FeedMessageEntry = FeedUserMessageEntry | FeedAgentMessageEntry;

export type FeedEntry = FeedEventEntry | FeedMessageEntry;

export type FeedPage = {
  /** Oldest → newest, all with an id below the requested `before`. */
  entries: FeedEntry[];
  /** Older entries exist. */
  has_more: boolean;
};

/** A feed page as loaded by Pearl, after lines it can't show were dropped. */
export type LoadedFeedPage = FeedPage & {
  /** Oldest id the middleware sent, dropped lines included: the next `before`. */
  oldestId?: number;
};

export type ChatRequest = {
  text: string;
  client_id: string;
};

export type ChatReply = {
  message: FeedUserMessageEntry;
  reply: FeedAgentMessageEntry;
};
