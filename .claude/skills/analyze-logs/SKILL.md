---
name: analyze-logs
description: Analyze Pearl app logs to diagnose what went wrong. Invoke automatically when the user provides a path to a Pearl logs directory, shares Pearl log files, mentions log analysis, or attaches screenshots of Pearl app errors. Handles electron.log, cli.log, agent_runner.log, tm.log, sc-{uuid}_agent.log, debug_data.json, and optional UI screenshots.
argument-hint: [path-to-logs-directory-or-zip]
allowed-tools: Read, Glob, Grep, Bash(tail *), Bash(wc -l *), Bash(ls *), Bash(unzip *), Bash(mktemp *), Bash(file *)
---

# Pearl Log Analysis Skill

You are a Pearl app diagnostic expert. Your job is to analyze logs and screenshots to find root causes and explain them clearly.

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

## Step 0b — Load Reference Files

Before starting, read the following reference files from this skill directory. They contain the knowledge you need to do a thorough analysis:

- `.claude/skills/analyze-logs/log-formats.md` — Pearl log file types, formats, and prefixes
- `.claude/skills/analyze-logs/known-patterns.md` — Known failure patterns with symptoms, causes, and where to look
- `.claude/skills/analyze-logs/report-template.md` — Output report template to fill in at the end

## Step 1 — Determine Invocation Scenario

| Scenario | Action |
|----------|--------|
| **Logs directory provided, no screenshot** | Normal flow — Steps 2–7. Skip Step 3. |
| **Logs directory + screenshot(s) attached** | Full flow — all steps including Step 3. Cross-reference screenshots in Steps 6 & 7. |
| **Screenshot(s) only, no logs directory** | Say: _"I can see your screenshot(s) but no logs directory was provided. To give you a full diagnosis, please share the Pearl logs directory path. In the meantime, here's what I can see from the screenshot:"_ — run Step 3 only, produce a partial report. Mark findings that **cannot be confirmed without logs**. Do NOT fabricate log evidence. |
| **Neither provided** | Ask: "Please provide the path to the Pearl logs directory (e.g. `/tmp/pearl_logs_2026-03-05`). You can also attach screenshots of the Pearl app if you have them." |

## Step 2 — Determine Date Filter

Examine the most recent timestamps across the log files:

- Read the **last 100 lines** of `electron.log` and `cli*.log` to find the newest timestamp.
- Compute the cutoff: `newest_timestamp - 48 hours`.
- All analysis focuses on entries at or after this cutoff.
- State the detected date range clearly at the top of your output.

## Step 3 — Analyse Attached Screenshots _(skip if no images attached)_

For each screenshot, extract:

| Signal | What to look for |
|--------|-----------------|
| **Screen / page** | Which Pearl screen is shown (Home, Agent detail, Settings, etc.) |
| **Agent status badge** | Running / Stopped / Error / Loading |
| **AutoRun toggle** | On or Off |
| **Balance display** | Visible ETH / OLAS / USDC amounts; flag "Low balance" warnings |
| **Error dialogs / toasts** | Quote exact visible error text; note if modal, banner, or OS notification |
| **Greyed-out controls** | Start button disabled, tooltip text if visible |
| **App version / timestamp** | Version badge or any visible timestamp |

After reading all screenshots, write a **"User-Visible State" summary** (bullet points). Cross-reference this in Steps 6 & 7.

**Screenshot-to-log correlations to check:**
- "Low balance" in UI + `funding_requirements` 500 in cli.log → likely `min_staking_deposit=None` backend bug, not actual low funds
- AutoRun ON + agent stopped + `infra_failed` in electron.log → transient failure, not user error
- Visible error dialog text → search that exact string in `cli*.log` and `next.log` to find the originating line

## Step 4 — Read Context Files

Read these files in full (they are small):
- `os_info.txt` — note OS, memory, platform
- `debug_data.json` — note service IDs, agent types, chain IDs, wallet addresses (redact private keys if any appear)

## Step 5 — Analyse Each Log File

For each log file present in the directory, read the relevant portion within the 48-hour window. Refer to `log-formats.md` for file-specific signal lists and noise filters.

## Step 6 — Root Cause Analysis

Based on the timeline and error patterns, identify:

1. **What failed** — the specific operation or component
2. **When it started** — first occurrence
3. **Why it likely failed** — root cause hypothesis
4. **Impact** — user-visible effect
5. **Contributing factors** — secondary issues
6. **Cross-check with screenshots** _(if Step 3 was run)_ — confirm user-visible state matches log evidence; flag discrepancies explicitly

Check `known-patterns.md` first — the issue may already be a documented pattern.

If multiple issues exist, rank by severity.

## Step 7 — Reconstruct Timeline & Produce Report

1. Build a **chronological timeline** of key events from the last 48 hours (state changes and failures only, not routine polling). Format: `YYYY-MM-DD HH:MM  [SOURCE]  Event description`. Group by session (app start → app stop).
2. Fill in the report template from `report-template.md` and output the completed report.
