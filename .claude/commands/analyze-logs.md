You are analyzing Pearl app logs to diagnose what went wrong.

The logs directory to analyze is: **$ARGUMENTS**

If no argument is provided, ask the user: "Please provide the path to the Pearl logs directory (e.g. `pearl-logs-example` or `/tmp/pearl_logs_2026-03-05`)."

---

## Pearl Logging System Context

Pearl is an Electron + Next.js + Python backend desktop app. Logs come from:

| File | Source | Format |
|------|--------|--------|
| `electron.log` | Electron main process & AutoRun events | `2026-03-03T12:34:56.789Z electron: <msg>` |
| `next.log` | Next.js frontend | `[2026-03-03 12:34:56.789] [level] <msg>` or `2026-03-03T12:34:56Z next: <msg>` |
| `cli.log` / `cli*.log` | Python backend (olas-operate-middleware) | `2026-03-03T12:34:56.789Z cli: [2026-03-03 12:34:56,789][LEVEL] [COMPONENT] <msg>` |
| `agent_runner.log` | Agent bootstrap process | `[2026-03-03 12:34:56,789] [LEVEL] [component] <msg>` |
| `tm.log` | Tendermint consensus | `I[2026-03-03\|12:34:56.789] <msg> module=...` |
| `sc-{uuid}_agent.log` | Per-service agent logs | `[2026-03-03 12:34:56,789] [LEVEL] [component] <msg>` |
| `debug_data.json` | Service config snapshot | JSON |
| `os_info.txt` | System info | Plain text |

**AutoRun log prefix**: `autorun::` (appears in electron.log)

**File paths in logs** are masked with asterisks for privacy: `/Users/*******/.operate/...`

---

## Step 1 — Determine Date Filter

Examine the most recent timestamps across the log files. The goal is to focus on the **last 2 days** of activity relative to the newest log entry found (not today's system date, since these may be exported logs from another day).

- Read the **last 100 lines** of `electron.log` and `cli*.log` to find the newest timestamp.
- Compute the cutoff: `newest_timestamp - 48 hours`.
- All analysis below should focus on entries at or after this cutoff.
- State the detected date range clearly at the top of your output.

---

## Step 2 — Read Context Files

Read these files in full (they are small):
- `os_info.txt` — note OS, memory, platform
- `debug_data.json` — note service IDs, agent types, chain IDs, wallet addresses (redact private keys if any leak through)

---

## Step 3 — Analyze Each Log File

For each log file present in the directory, read the relevant portion and extract meaningful signals. Focus on entries within the 48-hour window determined in Step 1.

### 3a. `electron.log` — AutoRun & App Lifecycle

Look for these event categories and note their timestamps:
- **App lifecycle**: startup, shutdown, backend connection lost/restored
- **AutoRun state changes**: `autorun:: enabled`, `autorun:: disabled`, `autorun:: rotation triggered`
- **Start/stop events**: `autorun:: starting`, `autorun:: started`, `autorun:: stopping`, `autorun:: stopped`
- **Failures**: `autorun:: start error`, `autorun:: stop failed`, `autorun:: infra_failed`, `autorun:: rewards eligibility timeout`
- **Stale data**: `autorun:: balances stale`, `autorun:: triggering refetch`
- **Sleep/wake**: any sleep-detection messages
- **Backend errors**: `ECONNREFUSED`, `Failed to fetch`, `Backend not running`

### 3b. `next.log` — Frontend Errors

Look for:
- `[error]` entries — unhandled rejections, React errors, component crashes
- `Failed to fetch` patterns
- Component stack traces (note the failing component if identifiable)
- Multiple rapid restarts of Next.js server

### 3c. `cli*.log` — Python Backend (Backend Team)

This is the primary source for backend API debugging. Look for:

**API call failures** (useful for backend team):
- HTTP 4xx / 5xx responses — note the endpoint, method, and status code
- Failed API requests with error bodies — quote the full response where available
- Repeated failing endpoints — indicates a persistent backend issue vs transient

**Service lifecycle errors**:
- `[ERROR]` or `[WARNING]` from named components: `[FUNDING MANAGER]`, `[SERVICE MANAGER]`, `[HEALTH_CHECKER]`
- Service deployment failures (start/stop errors, Tendermint exit failures)
- `[HEALTH_CHECKER] not healthy for N time in a row` — note how many consecutive failures and whether the service eventually recovered

**Agent setup errors**:
- IPFS fetch failures during agent package download
- Certificate issuance failures
- `aea command` errors (init, fetch, add-key, issue-certificates)

**Python exceptions**:
- Tracebacks (`Traceback (most recent call last)`) — quote the exception type and message
- `Exception` or `Error` in log lines outside HTTP responses

**Funding / balance**:
- `[FUNDING MANAGER] Skipping non-positive amount` — normal, safe to ignore
- Actual funding transfer failures or chain RPC errors during funding

**Note**: Routine lines to skip — `200 OK` HTTP responses, `[INFO] Computing protocol asset requirements`, `Successfully added` package lines during agent setup.

### 3d. `agent_runner.log` — Agent Runtime (Agents Team)

This log covers the AEA (Autonomous Economic Agent) lifecycle after bootstrap. The top of the file contains a large IPFS package table — skip this noise and focus on timestamped entries after the table. Look for:

**Bootstrap warnings** (often benign but worth noting):
- `kwargs ... have not been set` — optional config params not provided (e.g. Tenderly, CoinGecko API keys); flag only if they seem required for the agent's core function
- `Class BaseHandler ... not declared in the configuration file` — usually benign, skip

**Agent initialization**:
- `KV database initialized` / `KV database connection established` — confirms DB is up
- Balance checks: `USDC balance sufficient` / `ETH balance` — note values and thresholds; flag if insufficient
- `ABCI` or `Tendermint` connection status at startup

**Round and behaviour transitions** (useful for tracking agent progress):
- `Entered in the '{round_name}' round for period {N}` — normal execution flow
- `'{round_name}' round is done with event: Event.{EVENT}` — note unexpected events (not `DONE`)
- Stalled rounds: if the same round appears repeatedly without advancing, flag it

**Skill / behaviour errors**:
- `[ERROR]` entries — quote them; common example: `Incorrect number of contents. Expected N. Found M`
- Failed HTTP calls made by the agent (e.g. to Safe API, RPC endpoints, external APIs)
- Transaction failures or simulation errors

**Operational data** (useful context, not errors):
- Position amounts, token balances, strategy fetches — helps understand what the agent was doing when something failed

### 3e. `tm.log` — Tendermint

Look for:
- `E[` prefix entries (errors)
- `abci.socketClient failed to connect` — indicates agent not ready
- Repeated retry loops without success
- Any `panic` or fatal messages

### 3f. `sc-{uuid}_agent.log` — Service Agent Logs

For each service log file:
- Note which agent type it likely belongs to (check `debug_data.json` to match UUID to agent)
- Look for `[ERROR]` entries
- Look for skill/behaviour failures
- Look for transaction failures or RPC errors
- Note any repeated error patterns

---

## Step 4 — Reconstruct Timeline

Create a **chronological timeline** of the key events from the last 2 days. Focus on state changes and failures, not routine polling. Format:

```
YYYY-MM-DD HH:MM  [SOURCE]  Event description
```

Group by session (app start → app stop).

---

## Step 5 — Root Cause Analysis

Based on the timeline and error patterns, identify:

1. **What failed** — the specific operation or component that broke
2. **When it started** — first occurrence of the failure
3. **Why it likely failed** — root cause hypothesis (e.g. network issue, insufficient balance, backend crash, Tendermint stuck, API timeout)
4. **Impact** — what was the user-visible effect (agent not running, funds not topped up, etc.)
5. **Contributing factors** — any secondary issues that made recovery harder

If multiple issues exist, rank them by severity.

---

## Step 6 — Output Report

Produce a structured diagnostic report:

```
## Pearl Log Analysis

### Analysis Window
- Logs span: {earliest} to {latest}
- Focused on: {cutoff} to {latest} (last 48 hours)

### System Info
- OS: ...
- Memory: ...
- Agent(s): {list from debug_data.json}

### Timeline of Key Events
{chronological list}

### Issues Found

#### 1. {Issue Title} [SEVERITY: Critical/High/Medium/Low]
- **What**: ...
- **First seen**: ...
- **Evidence**: (quote 1-3 relevant log lines with timestamps)
- **Likely cause**: ...
- **Impact**: ...

#### 2. {Issue Title} ...

### Root Cause Summary
{1-3 sentence summary of the primary cause}

### Recommended Actions
- [ ] Action 1
- [ ] Action 2
- [ ] ...

### Notes
{Any other observations, e.g. "Next.log contains errors from much older sessions that are outside the analysis window and appear unrelated"}
```

---

## Important Notes

- **Do not hallucinate log content.** Only report what you actually read from the files.
- **Quote exact log lines** when citing evidence (trimmed for readability is OK).
- **Multiple cli log files** may exist (`cli.log`, `cli4.log`, etc.) — read the most recent one (highest number suffix) or whichever is largest/most recent by timestamp content.
- **Agent UUIDs**: Match service UUIDs in log filenames to agent names using `debug_data.json` when possible.
- **Masked paths**: `/Users/*******/.operate/` is normal — do not flag this as an issue.
- **Routine noise to ignore**: Normal polling (funding checks every few minutes, HTTP 200 responses, heartbeat messages) should not clutter the report — only surface anomalies.
