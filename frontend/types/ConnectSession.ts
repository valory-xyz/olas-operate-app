/**
 * Contract for the Connect agent's local `POST /session` endpoint.
 *
 * The Connect agent's "brain" is a local Claude Code session. When the agent is
 * running, `POST http://127.0.0.1:8716/session` (re)launches that session and
 * the frontend surfaces the result. The request is issued by the Electron main
 * process (`connect-start-session`), not the renderer: the agent's server
 * enables no CORS, so a renderer fetch to it never leaves the browser.
 *
 * The failure state shown to the user is derived from the HTTP status +
 * `launched`, NOT from `harness` (which the server always sends and so can't
 * discriminate):
 * - a well-formed `200 { launched: false }` → the deep link wouldn't open, i.e.
 *   no Claude harness is installed (or the wrong one is selected) → prompt to
 *   download / surface the server message;
 * - anything else (transport error, or a non-2xx like `400` unknown-harness /
 *   `503` not-ready) → treated as a transient, retryable launch failure.
 */

/** Claude harness the agent launched (or attempted to launch). */
export type ConnectHarness = 'claude_code_desktop' | 'claude_code_cli';

/**
 * Raw body of a `POST /session` response, as parsed in `electron/main.js`
 * before it is normalized to `ConnectSessionResult`.
 * `200` returns `{ launched, harness, error? }`; FastAPI `HTTPException`s
 * (`400`/`503`) return `{ detail }` instead — hence both keys are optional.
 */
export type ConnectSessionResponse = {
  /** True when a Claude Code session was launched (200 only). */
  launched?: boolean;
  /** The harness used; always present on a 200 (not a usable discriminator). */
  harness?: ConnectHarness | null;
  /** Human-readable error on a 200 failure. */
  error?: string;
  /** Human-readable error on a 4xx/5xx HTTPException. */
  detail?: string;
};

/**
 * Normalized outcome of attempting to launch the session.
 *
 * `reachable: false` means the local server couldn't be reached at all
 * (transport error / abort). When reachable, `ok` is the HTTP 2xx flag and
 * `error` is the server's message (from `error` on a 200, or `detail` on a
 * 4xx/5xx).
 */
export type ConnectSessionResult =
  | { reachable: true; ok: boolean; launched: boolean; error?: string }
  | { reachable: false };
