You are analyzing Pearl app logs to diagnose what went wrong.

The logs directory to analyze is: **$ARGUMENTS**

## Step 0 — Handle Zip File (if applicable)

Check whether `$ARGUMENTS` ends in `.zip` or whether the user has attached / mentioned a `.zip` file:

1. **If a zip path is provided**, extract it to a temp directory before doing anything else:
   ```bash
   EXTRACT_DIR=$(mktemp -d)
   unzip -q "$ARGUMENTS" -d "$EXTRACT_DIR"
   ```
   Then use `$EXTRACT_DIR` as the logs directory for all subsequent steps. Tell the user: _"Extracted `{zip filename}` to a temporary directory. Proceeding with analysis."_

2. **If the zip is nested** (e.g. the zip contains a single subdirectory holding all the logs), detect this with `ls $EXTRACT_DIR` and set the logs directory to that subdirectory automatically.

3. **If extraction fails** (bad zip, password-protected, corrupted), stop and tell the user: _"Could not extract `{filename}`. Please check the file is a valid, unencrypted zip and try again."_

4. **If no zip is involved**, skip this step entirely.

---

## Invocation Scenarios

Determine which scenario applies before proceeding:

| Scenario | Action |
|----------|--------|
| **Logs directory (or extracted zip) provided, no screenshot** | Normal flow — Steps 1–6. Skip Step 2.5. |
| **Logs directory (or extracted zip) + screenshot(s) attached** | Full flow — run all steps including Step 2.5 after Step 2. Cross-reference screenshots in Steps 5 & 6. |
| **Screenshot(s) only, no logs directory** | Say: _"I can see your screenshot(s) but no logs directory was provided. To give you a full diagnosis, please share the Pearl logs directory path or zip file. In the meantime, here's what I can see from the screenshot:"_ — then run Step 2.5 only and produce a partial report. Clearly mark which findings **cannot be confirmed without logs**. Do NOT fabricate log evidence. |
| **Neither provided** | Ask: "Please provide the path to the Pearl logs directory or zip file (e.g. `pearl-logs-example`, `/tmp/pearl_logs_2026-03-05`, or `~/Downloads/pearl_logs.zip`). You can also attach screenshots of the Pearl app if you have them." |

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

**AutoRun log prefix**: `autorun:` (single colon, appears in electron.log)

**File paths in logs** are masked with asterisks for privacy: `/Users/*******/.operate/...`

---

## Step 1 — Determine Date Filter

Examine the most recent timestamps across the log files. The goal is to focus on the **last 2 days** of activity relative to the newest log entry found (not today's system date, since these may be exported logs from another day).

- Read the **last 100 lines** of `electron.log` and `cli*.log` to find the newest timestamp.
- Compute the cutoff: `newest_timestamp - 48 hours`.
- All analysis below should focus on entries at or after this cutoff.
- **CRITICAL: Strictly enforce the date filter.** Log files often contain months of history. When grepping for patterns (e.g. `epoch expired`, `not healthy`, error messages), ALWAYS filter by the 48-hour window. Do NOT report issues whose evidence falls entirely outside the window — those are historical, likely already resolved, and will mislead the diagnosis. If a pattern spans both old and recent dates, only cite the recent occurrences.
- State the detected date range clearly at the top of your output.

---

## Step 2 — Read Context Files

Read these files in full (they are small):
- `os_info.txt` — note OS, memory, platform
- `debug_data.json` — note service IDs, agent types, chain IDs, wallet addresses (redact private keys if any leak through)

---

## Step 2.5 — Analyse Attached Screenshots _(skip if no images attached)_

For each screenshot attached to the conversation, read it and extract the following signals:

| Signal | What to look for |
|--------|-----------------|
| **Screen / page** | Which Pearl screen is shown (Home, Agent detail, Settings, etc.) |
| **Agent status badge** | Running / Stopped / Error / Loading |
| **AutoRun toggle** | On or Off |
| **Balance display** | Visible ETH / OLAS / USDC amounts; flag if a "Low balance" warning is shown |
| **Error dialogs / toasts** | Quote the exact visible error text; note if it's a modal, banner, or OS notification |
| **Greyed-out controls** | Start button disabled, tooltip text if visible |
| **App version / timestamp** | Version badge or any visible timestamp in the UI |

After reading all screenshots, produce a short **"User-Visible State" summary** (bullet points). This will be cross-referenced during Step 5.

**Screenshot-to-log correlations to check:**
- "Low balance" shown in UI + `funding_requirements` returning 500 in cli.log → likely `min_staking_deposit=None` backend bug, not actual low funds
- AutoRun toggle ON + agent stopped + `infra_failed` in electron.log → transient failure, not user error
- Visible error dialog text → search that exact string in `cli*.log` and `next.log` to find the originating line

---

## Step 3 — Analyze Each Log File

For each log file present in the directory, read the relevant portion and extract meaningful signals. Focus on entries within the 48-hour window determined in Step 1.

### 3a. `electron.log` — AutoRun & App Lifecycle

Look for these event categories and note their timestamps:
- **App lifecycle**: startup, shutdown, backend connection lost/restored
- **AutoRun state changes**: `autorun: enabled`, `autorun: disabled`, `autorun: rotation triggered`, `autorun: rotate_begin`
- **Start/stop events**: `autorun: starting`, `autorun: started`, `autorun: stopping`, `autorun: stopped`
- **Start results**: `autorun: started` (deployed), `autorun: agent_blocked` (balance/eviction/deterministic), `autorun: infra_failed` (transient, queue does NOT advance), `autorun: aborted` (disabled or sleep)
- **Failures**: `autorun: start error`, `autorun: stop failed`, `autorun: infra_failed`, `autorun: rewards eligibility timeout`
- **Stale data**: `autorun: balances stale`, `autorun: triggering refetch`
- **Watchdog / rotation**: `autorun: rotate_begin` every ~4200s with a single configured agent is **expected behaviour** — watchdog fires, stays on same agent, not a bug
- **Sleep/wake**: any sleep-detection messages (elapsed > expected + 30s triggers bail-out and safety-net reschedule)
- **Epoch stuck (persistent)**: `epoch expired, stale isEligibleForRewards=true overridden to false` repeating every 2 minutes for hours/days. This means the on-chain `tsCheckpoint` is not advancing despite the agent running. Cross-reference with `sc-{uuid}_agent.log` to check if `ts_checkpoint` reads return the same value across all checkpoint calls — if so, the checkpoint is a silent no-op (see Step 3f).
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
- **`GET /api/v2/service/{id}/funding_requirements` returning 500** — almost always caused by `min_staking_deposit` being `None` in `funding_manager.py` (staking contract can't be resolved, e.g. after `.operate` folder move or staking program change). Frontend effect: `canStartSelectedAgent = false` → button greyed out with "Low balance" reason even when funds are present. File: `operate/services/funding_manager.py`.

**Staking / rewards**:
- `[WARNING] No staking contract found for the current_staking_program=None. Not claiming the rewards.` — **this is EXPECTED and NORMAL** when the service's hash or staking program has been recently updated. The old staking program reference is intentionally cleared during the update. Do NOT flag this as a bug or root cause. It is part of normal service lifecycle during updates. Only flag it if there is evidence the service has NOT been recently updated (no hash change, no staking program change in `debug_data.json` hash_history).

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

**Checkpoint loop with no state change (stuck epoch)**:
- Agent enters `call_checkpoint_round` repeatedly at period 0, each cycle: `Checkpoint reached! Preparing checkpoint tx..` → `Event.SETTLE` → tx submitted → `CHECKPOINT_TX_EXECUTED` → immediately re-enters `call_checkpoint_round`.
- **Diagnosis**: grep for `Calling method ts_checkpoint` and check the `body={'data': <value>}` across all reads. If `tsCheckpoint` is the **same value** across every read (e.g. 9 reads all returning `1774985691`), the checkpoint calls are **silent no-ops** — the Safe reports `ExecutionSuccess` but the staking contract doesn't update state. Confirm by checking tx receipts: if the receipt contains only the Safe's `ExecutionSuccess` event (`0x442e715f...`) and **zero events from the staking contract**, the inner call returned early without modifying state.
- **Root cause**: rewards pool is 0/empty on the staking contract — checkpoint has nothing to distribute so it returns early. This is the most common cause of the stuck checkpoint loop.
- **Secondary effects**: the tight checkpoint loop burns gas. The agent may then fail with `insufficient funds for gas * price + value` on subsequent operations (e.g. USDC swap: `USDC balance (715) < 200000, swapping ETH to 250000 USDC...` → gas error). Gas depletion is the **symptom**, not the root cause.
- **`Incorrect number of contents` errors** (`Expected 3. Found 4` and `Expected 1. Found 2`) appear during `validate_transaction_round` and `post_tx_settlement_round` on every checkpoint cycle. These are benign protocol message mismatches and do NOT cause the stuck checkpoint.
- **electron.log correlation**: `epoch expired, stale isEligibleForRewards=true overridden to false` repeating every 2 minutes for hours/days confirms the epoch is stuck. Check when the first `epoch expired` message appeared and compare to the `tsCheckpoint` value (convert Unix timestamp) to confirm the epoch end time matches.

**Polystrat-specific patterns**:
- `position.get("conditionId")` crash where `position` is a `str` — caused by `data-api.polymarket.com` read timeout returning a raw string instead of JSON. Entire agent loop crashes with `HTTP Client/Server has shutdown`. AutoRun correctly detects and restarts — the bug is a missing type check in agent code (`polymarket_reedem.py:136`), not a Pearl issue.
- `[ERROR] Trading restricted in your region - https://docs.polymarket.com/developers/CLOB/geoblock` — agent runs but cannot place bets; user may perceive AutoRun as ineffective but it is working correctly. Common on Windows-on-Apple-Silicon (Parallels). Not a Pearl/AutoRun bug.

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
6. **Cross-check with screenshots** _(if Step 2.5 was run)_ — confirm whether the user-visible state matches log evidence. Explicitly flag discrepancies (e.g. UI says "Low balance" but logs confirm funds are present and the real issue is a 500 on `funding_requirements`).

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

### User-Visible State _(omit if no screenshots provided)_
- Screen shown: ...
- Agent status: ...
- AutoRun: ...
- Visible error: "..."
- Notes: ...

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

## Known Failure Patterns (Quick Reference)

Use this section to quickly match symptoms to root causes before diving into the full analysis.

| Symptom | Likely Cause | Where to Look |
|---------|-------------|---------------|
| Button greyed out, "Low balance" reason, but funds present | `funding_requirements` API returning 500; `min_staking_deposit=None` in backend | `cli*.log` for `500` on `/api/v2/service/{id}/funding_requirements` |
| `current_staking_program=None` warning in cli logs | **EXPECTED** — service hash or staking program was recently updated; old reference intentionally cleared. NOT a bug. | `cli*.log` — only investigate further if `debug_data.json` `hash_history` shows NO recent update |
| Polystrat crashes with `HTTP Client/Server has shutdown` | `position.get("conditionId")` type error after polymarket API timeout | `sc-{uuid}_agent.log` for `conditionId` / `polymarket_reedem.py` |
| Polystrat running but not trading | Geo-block from Polymarket | `sc-{uuid}_agent.log` for `Trading restricted in your region` |
| AutoRun watchdog fires every ~70min, same agent restarts | Only one agent configured — expected watchdog rotation | `electron.log` for `autorun: rotate_begin` with no queue advancement |
| Agent not starting, AutoRun shows `agent_blocked` | Low balance, eviction, or staking slot unavailable | `cli*.log` `allow_start_agent`, `isAgentEvicted` signals |
| Agent not starting, AutoRun shows `infra_failed` | Transient network/timeout — queue does not advance | `cli*.log` for timeouts or connection errors around the same timestamp |
| Epoch clock shows 00:00:00 (frozen countdown) | Staking contract rewards pool is 0 → checkpoint no-op → `tsCheckpoint` never advances | `electron.log` for persistent `epoch expired` messages; `sc-{uuid}_agent.log` for identical `ts_checkpoint` values across reads |
| Agent stuck in `call_checkpoint_round` loop at period 0 | Rewards pool empty — checkpoint returns early, `tsCheckpoint` unchanged despite `ExecutionSuccess` on Safe | `sc-{uuid}_agent.log`: grep `Calling method ts_checkpoint` — same `body={'data': N}` on every read |
| Agent gas depleted after checkpoint loop | Secondary effect of stuck checkpoint: tight loop burns gas on useless txs; agent then fails USDC swap or next checkpoint | `sc-{uuid}_agent.log` for `insufficient funds for gas * price + value` after repeated `CHECKPOINT_TX_EXECUTED` |
| CORS errors on `funding_requirements` / backend API + 500 | Agent requesting incorrect address (not a frontend CORS config issue). Fix is in agent code, not Pearl CORS headers | Browser console for `Access-Control-Allow-Origin` errors paired with `net::ERR_FAILED 500`; the 500 causes missing CORS headers on the error response |

### Frontend "Start" Button Greyed Out — Triage Order

1. Check `useIsInitiallyFunded` — is it reading from the Electron store or hardcoded?
2. Check `GET /api/v2/service/{id}/funding_requirements` — is it returning 500?
3. Check `allow_start_agent` in backend response — is balance actually insufficient?
4. Check `isAgentEvicted` and staking slot availability in backend logs.

---

## Important Notes

- **Do not hallucinate log content.** Only report what you actually read from the files.
- **Quote exact log lines** when citing evidence (trimmed for readability is OK).
- **Multiple cli log files** may exist (`cli.log`, `cli4.log`, etc.) — read the most recent one (highest number suffix) or whichever is largest/most recent by timestamp content.
- **Agent UUIDs**: Match service UUIDs in log filenames to agent names using `debug_data.json` when possible.
- **Masked paths**: `/Users/*******/.operate/` is normal — do not flag this as an issue.
- **Routine noise to ignore**: Normal polling (funding checks every few minutes, HTTP 200 responses, heartbeat messages) should not clutter the report — only surface anomalies.
- **Screenshots**: Read attached images using the Read tool (if a file path is given) or directly from the conversation context (if inline). Both are equivalent.
- **Screenshots are point-in-time**: The UI state shown may not correspond to the exact moment of failure — always cross-reference with log timestamps rather than assuming the screenshot was taken at the failure instant.
