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
 *
 * OCB is the exception: a failed `ocb_cli` launch never falls back, and the
 * server's `reason` tells a failed install from a failed launch.
 */

/**
 * Harness the agent launched (or attempted to launch) — every value in the
 * agent server's `HARNESSES` tuple, Claude Code and Codex alike. Listed in
 * the order an unnamed launch falls back through (`workspace.py` →
 * `DEEP_LINKS`, then the terminal commands), so a Codex value is a
 * reachable answer rather than a theoretical one.
 */
export type ConnectHarness =
  | 'claude_code_cli'
  | 'codex_desktop'
  | 'claude_code_desktop'
  | 'codex_cli'
  | 'ocb_cli';

/** Why a `200 { launched: false }` launch failed. */
export type ConnectLaunchReason =
  | 'not_installed'
  | 'install_failed'
  | 'launch_failed';

/**
 * Raw body of a `POST /session` response, as parsed in `electron/main.js`
 * before it is normalized to `ConnectSessionResult`.
 * `200` returns `{ launched, harness, requested, reason?, error? }`; FastAPI `HTTPException`s
 * (`400`/`503`) return `{ detail }` instead — hence both keys are optional.
 */
export type ConnectSessionResponse = {
  /** True when an agent session was launched (200 only). */
  launched?: boolean;
  /** The harness used; always present on a 200 (not a usable discriminator). */
  harness?: ConnectHarness | null;
  /** The harness the launch aimed for; present on a 200. */
  requested?: ConnectHarness | null;
  /** Present iff a 200 with `launched === false`. */
  reason?: ConnectLaunchReason;
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
  | {
      reachable: true;
      ok: boolean;
      launched: boolean;
      requested?: ConnectHarness;
      reason?: ConnectLaunchReason;
      error?: string;
    }
  | { reachable: false };

/**
 * Which error state to surface for the Connect session:
 * - `not-installed`: the deep link wouldn't open → no Claude installed (or the
 *   wrong harness is selected) → prompt to download / surface the server message.
 * - `launch-failed`: transport error, or a non-2xx (unknown harness / not-ready
 *   / malformed) response → transient, retryable.
 * - `ocb-install-failed` / `ocb-launch-failed`: OCB was selected and Connect
 *   could not install it, or could not open it → retryable; Connect installs
 *   OCB itself, so there is nothing to download.
 */
export type ConnectSessionErrorKind =
  | 'not-installed'
  | 'launch-failed'
  | 'ocb-install-failed'
  | 'ocb-launch-failed';
