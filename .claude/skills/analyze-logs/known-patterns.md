# Known Failure Patterns

Check this file first when diagnosing an issue. If the symptom matches, you have a high-confidence root cause without needing to do a full log trawl.

---

## Quick Reference Table

| Symptom | Likely Cause | Where to Look |
|---------|-------------|---------------|
| Button greyed out, "Low balance" reason, but funds appear present | `funding_requirements` API returning 500; `min_staking_deposit=None` in backend | `cli*.log` for `500` on `GET /api/v2/service/{id}/funding_requirements` |
| Rewards accumulating in Safe, not swept to master wallet | `current_staking_program=None` after service stop | `cli*.log` for `No staking contract found for the current_staking_program=None` |
| Polystrat crashes with `HTTP Client/Server has shutdown` | `position.get("conditionId")` type error after polymarket API timeout | `sc-{uuid}_agent.log` for `conditionId` / `polymarket_reedem.py` |
| Polystrat running but not trading | Geo-block from Polymarket | `sc-{uuid}_agent.log` for `Trading restricted in your region` |
| AutoRun watchdog fires every ~70min, same agent keeps restarting | Only one agent configured — expected watchdog rotation | `electron.log` for `autorun: rotate_begin` with no queue advancement |
| Agent not starting, AutoRun shows `agent_blocked` | Low balance, eviction, or staking slot unavailable | `cli*.log` for `allow_start_agent=false`, eviction or staking signals |
| Agent not starting, AutoRun shows `infra_failed` | Transient network/timeout — queue does not advance | `cli*.log` for timeouts or connection errors at the same timestamp |

---

## Detailed Pattern Descriptions

### Pattern 1: `funding_manager.py` NoneType Crash

**Symptom**: Start button greyed out with "Low balance" UI label even though the wallet has sufficient funds.

**Root cause**: `staking_params["min_staking_deposit"] * number_of_agents` in `funding_manager.py` where `min_staking_deposit` is `None`. This happens when the staking contract cannot be resolved — e.g. after moving the `.operate` folder or changing the staking program.

**Effect chain**: `GET /api/v2/service/{id}/funding_requirements` → 500 → frontend `canStartSelectedAgent = false` → button greyed out with "Low balance".

**Evidence to quote**: HTTP 500 on `funding_requirements` endpoint in `cli*.log`, plus a Python traceback mentioning `NoneType` multiplication.

**File**: `operate/services/funding_manager.py`

**Severity**: High — agent cannot start until backend is fixed or `.operate` state is repaired.

---

### Pattern 2: `current_staking_program=None` After Service Stop

**Symptom**: Rewards accumulate in the Safe wallet but are never swept to the master wallet. User may notice OLAS balance not growing despite agent running.

**Root cause**: Staking program reference is lost when the service stops. The sweep function `claim_all_on_chain_from_safe` skips silently.

**Evidence to quote**: `[WARNING] No staking contract found for the current_staking_program=None. Not claiming the rewards.` in `cli*.log`.

**Severity**: Medium — not a crash, but funds are stranded in Safe until resolved.

---

### Pattern 3: Polystrat `polymarket_reedem.py` Type Crash

**Symptom**: Polystrat agent crashes entirely; `sc-{uuid}_agent.log` shows `HTTP Client/Server has shutdown`. AutoRun restarts the agent.

**Root cause**: `position.get("conditionId")` is called where `position` is a `str` (not a dict), because `data-api.polymarket.com` returned a read timeout causing the response to be parsed as a plain string.

**Evidence to quote**: `AttributeError: 'str' object has no attribute 'get'` or similar, referencing `polymarket_reedem.py:136`.

**Important**: AutoRun detecting this and restarting is **correct behaviour**. The bug is in the agent code, not Pearl.

**Severity**: Medium — agent self-recovers via AutoRun restart; underlying agent bug should be reported to agent team.

---

### Pattern 4: Polystrat Polymarket Geo-Block

**Symptom**: Agent appears to run (status: running, AutoRun: on) but no trades are placed. User perceives AutoRun as ineffective.

**Root cause**: Polymarket blocks the user's IP region. Common on Windows-on-Apple-Silicon (Parallels) where the VM's IP may be geo-blocked.

**Evidence to quote**: `[ERROR] Trading restricted in your region - https://docs.polymarket.com/developers/CLOB/geoblock`

**Important**: Pearl and AutoRun are working correctly. This is a Polymarket access issue.

**Severity**: Low (for Pearl) — user needs to resolve geo-access; not a Pearl/AutoRun bug.

---

### Pattern 5: AutoRun Watchdog With Single Agent

**Symptom**: `autorun: rotate_begin` appears in `electron.log` every ~4200s (70 min). Agent stops and restarts on the same agent. User may think something is wrong with rotation.

**Root cause**: AutoRun watchdog fires on schedule. With only one agent configured, it evaluates the queue, finds only the current agent, and restarts it on the same one.

**Important**: This is **expected behaviour**. Not a bug.

**Severity**: None — informational only.

---

## Frontend "Start" Button Greyed Out — Triage Order

If the user reports the start button is disabled or greyed out, check in this order:

1. **`useIsInitiallyFunded`** — is it reading from the Electron store correctly, or returning a hardcoded value?
2. **`GET /api/v2/service/{id}/funding_requirements`** — is it returning 500? (→ Pattern 1 above)
3. **`allow_start_agent`** in backend response — is the balance actually insufficient?
4. **`isAgentEvicted`** and staking slot availability in backend logs.
