# Report Template

Fill in and output this template at the end of every analysis. Remove sections marked as optional if they don't apply.

---

```
## Pearl Log Analysis

### Analysis Window
- Logs span: {earliest timestamp found} to {latest timestamp found}
- Focused on: {cutoff = latest - 48h} to {latest} (last 48 hours)

### System Info
- OS: {from os_info.txt}
- Memory: {from os_info.txt}
- Platform: {e.g. macOS ARM64, Windows x64, Parallels/ARM}
- Agent(s): {list from debug_data.json — type + service ID}
- Chain(s): {chain IDs from debug_data.json}

### User-Visible State _(omit if no screenshots provided)_
- Screen shown: ...
- Agent status: ...
- AutoRun: On / Off
- Visible error: "..."
- Notes: ...

### Timeline of Key Events
{Chronological list of state changes and failures only — not routine polling}

YYYY-MM-DD HH:MM  [SOURCE]  Event description
YYYY-MM-DD HH:MM  [SOURCE]  Event description
...

{Group by session where possible: --- Session 1: {start time} → {end time} ---}

### Issues Found

#### 1. {Issue Title} [SEVERITY: Critical / High / Medium / Low / None]
- **What**: ...
- **First seen**: ...
- **Evidence**:
  ```
  {1-3 exact log lines with timestamps, trimmed for readability}
  ```
- **Likely cause**: ...
- **Impact**: {user-visible effect}
- **Matches known pattern**: {pattern name from known-patterns.md, or "No"}

#### 2. {Issue Title} [SEVERITY: ...]
...

### Root Cause Summary
{1-3 sentences. Lead with the primary cause. Note if the issue is a Pearl bug, an agent bug, a backend bug, or expected behaviour.}

### Recommended Actions
- [ ] {Action 1 — who should do it: user / backend team / agent team / Pearl team}
- [ ] {Action 2}
- [ ] ...

### Notes
{Any other observations — e.g. "next.log contains errors from older sessions outside the analysis window and appear unrelated", "masked file paths are normal and were not flagged", etc.}
```

---

## Severity Definitions

| Level | Meaning |
|-------|---------|
| **Critical** | Agent cannot run at all; funds at risk; data loss |
| **High** | Agent cannot start or stops repeatedly; user action required |
| **Medium** | Agent runs but degrades (e.g. rewards not swept, some trades missed) |
| **Low** | Minor issue or cosmetic; agent continues to operate normally |
| **None** | Expected behaviour, not a bug |

## Important Notes for Analysis

- **Do not hallucinate log content.** Only report what you actually read from the files.
- **Quote exact log lines** when citing evidence (trimmed for readability is OK).
- **Agent UUIDs**: Match service UUIDs in log filenames to agent names using `debug_data.json` when possible.
- **Masked paths**: `/Users/*******/.operate/` is normal — do not flag this as an issue.
- **Screenshots are point-in-time**: UI state shown may not match the exact failure moment — always cross-reference with log timestamps.
- **Screenshots**: Read attached images using the Read tool (if a file path is given) or directly from conversation context (if inline). Both are equivalent.
- **Routine noise to ignore**: Normal polling (funding checks every few minutes, HTTP 200 responses, heartbeat messages) — only surface anomalies.
