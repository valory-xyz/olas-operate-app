# Pearl Log Formats

## File Overview

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

**AutoRun log prefix**: `autorun:` (single colon, appears in `electron.log`)

**File paths in logs** are masked with asterisks for privacy: `/Users/*******/.operate/...` — do not flag this as an issue.

**Multiple cli log files**: `cli.log`, `cli4.log`, etc. — read the most recent one (highest number suffix or most recent by timestamp content).

---

## Per-File Signal Guide

### `electron.log` — AutoRun & App Lifecycle

Look for:
- **App lifecycle**: startup, shutdown, backend connection lost/restored
- **AutoRun state changes**: `autorun: enabled`, `autorun: disabled`, `autorun: rotation triggered`, `autorun: rotate_begin`
- **Start/stop events**: `autorun: starting`, `autorun: started`, `autorun: stopping`, `autorun: stopped`
- **Start result statuses**:
  - `autorun: started` — agent deployed and running
  - `autorun: agent_blocked` — deterministic blocker (low balance, eviction, etc.); queue advances
  - `autorun: infra_failed` — transient (network/timeout); queue does NOT advance
  - `autorun: aborted` — AutoRun was disabled or sleep was detected
- **Failures**: `autorun: start error`, `autorun: stop failed`, `autorun: infra_failed`, `autorun: rewards eligibility timeout`
- **Stale data**: `autorun: balances stale`, `autorun: triggering refetch`
- **Watchdog / rotation**: `autorun: rotate_begin` firing every ~4200s with a single configured agent is **expected behaviour** — watchdog fires, stays on same agent, not a bug
- **Sleep/wake**: elapsed > expected + 30s triggers bail-out and safety-net reschedule
- **Backend errors**: `ECONNREFUSED`, `Failed to fetch`, `Backend not running`

---

### `next.log` — Frontend Errors

Look for:
- `[error]` entries — unhandled rejections, React errors, component crashes
- `Failed to fetch` patterns
- Component stack traces (note the failing component if identifiable)
- Multiple rapid restarts of Next.js server

---

### `cli*.log` — Python Backend

**API call failures**:
- HTTP 4xx / 5xx responses — note endpoint, method, status code
- Failed API requests with error bodies — quote full response where available
- Repeated failing endpoints — indicates persistent vs transient issue

**Service lifecycle errors**:
- `[ERROR]` or `[WARNING]` from: `[FUNDING MANAGER]`, `[SERVICE MANAGER]`, `[HEALTH_CHECKER]`
- Service deployment failures (start/stop errors, Tendermint exit failures)
- `[HEALTH_CHECKER] not healthy for N time in a row` — note consecutive count and whether it recovered

**Agent setup errors**:
- IPFS fetch failures during package download
- Certificate issuance failures
- `aea command` errors (init, fetch, add-key, issue-certificates)

**Python exceptions**:
- Tracebacks (`Traceback (most recent call last)`) — quote exception type and message
- `Exception` or `Error` in log lines outside HTTP responses

**Funding / balance**:
- `[FUNDING MANAGER] Skipping non-positive amount` — normal, safe to ignore
- Actual funding transfer failures or chain RPC errors
- **`GET /api/v2/service/{id}/funding_requirements` returning 500** — almost always `min_staking_deposit=None` in `funding_manager.py`; see `known-patterns.md`

**Staking / rewards**:
- `[WARNING] No staking contract found for the current_staking_program=None. Not claiming the rewards.` — see `known-patterns.md`

**Routine noise to skip**: `200 OK` responses, `[INFO] Computing protocol asset requirements`, `Successfully added` package lines during agent setup.

---

### `agent_runner.log` — Agent Runtime

The top of this file contains a large IPFS package table — skip it and focus on timestamped entries after the table.

**Bootstrap warnings** (often benign):
- `kwargs ... have not been set` — optional config params (Tenderly, CoinGecko API keys); flag only if required for core function
- `Class BaseHandler ... not declared in the configuration file` — usually benign, skip

**Agent initialization**:
- `KV database initialized` / `KV database connection established` — DB is up
- Balance checks: `USDC balance sufficient` / `ETH balance` — note values and thresholds; flag if insufficient
- `ABCI` or `Tendermint` connection status at startup

**Round and behaviour transitions**:
- `Entered in the '{round_name}' round for period {N}` — normal
- `'{round_name}' round is done with event: Event.{EVENT}` — note unexpected events (anything not `DONE`)
- Stalled rounds: same round repeating without advancing → flag it

**Skill / behaviour errors**:
- `[ERROR]` entries — quote them; common example: `Incorrect number of contents. Expected N. Found M`
- Failed HTTP calls by the agent (Safe API, RPC endpoints, external APIs)
- Transaction failures or simulation errors

**Operational data** (context, not errors):
- Position amounts, token balances, strategy fetches — useful for understanding what was happening at failure time

---

### `tm.log` — Tendermint

Look for:
- `E[` prefix entries (errors)
- `abci.socketClient failed to connect` — agent not ready
- Repeated retry loops without success
- Any `panic` or fatal messages

---

### `sc-{uuid}_agent.log` — Per-Service Agent Logs

For each file:
- Match UUID to agent name using `debug_data.json`
- Look for `[ERROR]` entries
- Look for skill/behaviour failures
- Look for transaction failures or RPC errors
- Note repeated error patterns

**Polystrat-specific patterns**:
- `position.get("conditionId")` crash where `position` is a `str` — `data-api.polymarket.com` read timeout returned a raw string instead of JSON; entire agent loop crashes with `HTTP Client/Server has shutdown`. AutoRun correctly detects and restarts. Bug is in agent code (`polymarket_reedem.py:136`), not Pearl.
- `[ERROR] Trading restricted in your region - https://docs.polymarket.com/developers/CLOB/geoblock` — agent runs but cannot place bets. AutoRun is working correctly. Common on Windows-on-Apple-Silicon (Parallels). Not a Pearl/AutoRun bug.
