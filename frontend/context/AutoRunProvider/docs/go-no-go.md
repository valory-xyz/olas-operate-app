# Go/No-Go Checklist — Auto-Run MVP

Use this right before release. If any **A** or **B** item fails, it’s a **No‑Go**.

---

## A. Must-Pass Functional Checks (Release Blockers)

1. **Auto-run starts an eligible agent**
   - Enable auto-run with at least one eligible agent → agent starts within timeout.

2. **Auto-run stops agent on disable**
   - Toggle OFF → running agent stops (no lingering deployment).

3. **Rotation on rewards**
   - Running agent earns rewards → stops → next eligible starts.

4. **No skipping on Loading**
   - “Loading: Balances/Safe/Services/Geo/Staking” never shows skip notification.

5. **Single-agent execution**
   - System never runs more than one agent concurrently.

6. **Inclusion/exclusion persisted**
   - Restart app → included order and exclusions preserved.

---

## B. Stability & Safety (Release Blockers)

7. **No infinite waits**
   - `waitForAgentSelection` and `waitForBalancesReady` are guarded by `enabledRef.current` and both have explicit hard timeouts, so they cannot block indefinitely.
   - `waitForRunningAgent`, `waitForEligibilityReady`, and `waitForRewardsEligibility` have explicit time-based timeouts; stop flow uses deployment-status timeout checks inside bounded recovery attempts.
   - **No longer a No-Go.** ✓

8. **Start failures handled**
   - If start fails repeatedly due transient infra/RPC errors, auto-run retries the **same** agent and does not advance queue to a different agent.

9. **Stop failures handled**
   - If stop times out, auto-run enters bounded stop recovery (retries stop + deployment status checks) and does not start the next agent until stop is confirmed.
   - Manual disable uses the same recovery path; disable should not exit early just because auto-run flag is OFF.

10. **Sleep/wake recovery**
    - Close and reopen laptop lid while auto-run is active → no chaotic cycling; stale delays abort cleanly and orchestration restarts with fresh state.

---

## C. UX Expectations (Strongly Recommended)

11. **Toggle shows loading**
    - Switch shows loading state during start/stop.

12. **Skip notifications are meaningful**
    - Only real blockers (Low balance, Evicted, Region restricted, etc.) generate skip notifications.

13. **Manual sidebar navigation works**
    - User can browse agents while auto-run runs in background.

---

## Result

- **Go** if all A + B pass and no critical UX issues.
- **No‑Go** if any A or B fails.
