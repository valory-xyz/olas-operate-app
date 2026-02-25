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
   - Auto-run does not freeze permanently; timeouts or rescan kicks in.

8. **Start failures handled**
   - If start fails repeatedly, auto-run logs and moves on without crashing.

9. **Stop failures handled**
   - If stop times out, auto-run logs and does not deadlock.

---

## C. UX Expectations (Strongly Recommended)

10. **Toggle shows loading**
    - Switch shows loading state during start/stop.

11. **Skip notifications are meaningful**
    - Only real blockers (Low balance, Evicted, Region restricted, etc.) generate skip notifications.

12. **Manual sidebar navigation works**
    - User can browse agents while auto-run runs in background.

---

## Result

- **Go** if all A + B pass and no critical UX issues.
- **No‑Go** if any A or B fails.

