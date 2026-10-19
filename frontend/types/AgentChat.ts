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
  type: string;
  title: string;
  fields: FeedEventField[];
};

export type FeedMessageEntry = {
  id: number;
  /** Unix seconds. */
  ts: number;
  kind: 'message';
  role: 'user' | 'agent';
  text: string;
  /** On user lines, and on agent lines with the `client_id` they answer. */
  client_id?: string;
};

export type FeedEntry = FeedEventEntry | FeedMessageEntry;

export type FeedPage = {
  /** Oldest → newest, all with an id below the requested `before`. */
  entries: FeedEntry[];
  /** Older entries exist. */
  has_more: boolean;
};

export type ChatRequest = {
  text: string;
  client_id: string;
};

export type ChatReply = {
  message: FeedMessageEntry;
  reply: FeedMessageEntry;
};
