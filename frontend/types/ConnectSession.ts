/**
 * Contract for the Connect agent's local `POST /session` endpoint.
 *
 * The Connect agent's "brain" is a local Claude Code session. When the agent is
 * running, the frontend calls `POST http://127.0.0.1:8716/session` to (re)launch
 * that session and surfaces the result.
 *
 * The two failure states the UI distinguishes are derived from this body:
 * - no `harness` was launched → no Claude harness is installed on the machine
 *   ("Claude isn't installed", prompt to download);
 * - a `harness` is present but `launched` is false → the launch itself failed
 *   (transient, retryable).
 */

/** Claude harness the agent launched (or attempted to launch). */
export type ConnectHarness = 'claude_code_desktop' | 'claude_code_cli';

/** Body of a `POST /session` response (server was reachable). */
export type ConnectSessionResponse = {
  /** True when a Claude Code session was launched. */
  launched: boolean;
  /** The harness used; null/absent when no harness is installed. */
  harness?: ConnectHarness | null;
  /** Human-readable error message (present when `launched` is false). */
  error?: string;
};

/**
 * Outcome of attempting to launch the session.
 *
 * `reachable: false` means the local server couldn't be reached at all
 * (transport error / abort) — treated as a retryable failure, distinct from a
 * response that reached us reporting `launched: false`.
 */
export type ConnectSessionResult =
  | ({ reachable: true } & ConnectSessionResponse)
  | { reachable: false };
