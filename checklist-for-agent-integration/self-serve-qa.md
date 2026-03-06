# Self-Serve QA Guide

This guide walks you through validating your agent integration with Pearl before submitting it to Valory for review. By the end, your agent should be fully functional and tested end-to-end so that Valory can proceed directly to audit and integration.

> **Prerequisite:** Phases 0–5 of the [Agent Integration Checklist](./complete-checklist.md) must be complete before starting QA.

---

## Phase 1 — Build & Package

Confirm your agent fully implements all Pearl integration requirements (Phases 0–5 of the Agent Integration Checklist) and that your CI/CD is configured before testing begins.

- [ ] All items in Phases 0–5 of the integration checklist are complete
- [ ] Release binaries built for all supported target platforms
- [ ] Linting, type checking, and security checks passing in CI
- [ ] Unit and integration tests passing in CI
- [ ] Release artifacts published and reproducible by Valory

---

## Phase 2 — Set Up the Test Environment

Valory will create a Pearl branch that includes your agent. This is your testing environment.

- [ ] Wait for Valory to notify you that your Pearl test branch is ready
- [ ] Fork that branch into your own repository
- [ ] Build and run Pearl locally from your fork
- [ ] Confirm your agent appears in the Pearl interface as expected

---

## Phase 3 — Test Scenarios

The scenarios below are the baseline of what must be validated. Your agent may have additional flows that require testing beyond what is listed.

### Wallet & Funding

- [ ] Full onboarding flow from a fresh state completes without errors
- [ ] Pearl Signer is funded correctly with the required gas token for your network
- [ ] Pearl Safe is created automatically once all required funds are received
- [ ] Funds move from Signer to Safe as expected
- [ ] Correct token type is required and surfaced in the UI
- [ ] Insufficient funds and wrong token type error states are handled correctly

### Agent Lifecycle

- [ ] Agent starts successfully
- [ ] Agent stops cleanly and resumes correctly after a restart
- [ ] No stuck states or unexpected errors during normal operation
- [ ] Agent UI is accessible and works as expected (if applicable)

### Staking & Rewards (if applicable)

- [ ] Rewards display correctly after agent activity
- [ ] User can unstake and withdraw cleanly

### Edge Cases & Error Handling

- [ ] RPC failures are handled gracefully — agent retries or surfaces a clear error
- [ ] Mid-run stop and restart completes without data loss
- [ ] Withdrawal flow works correctly from all expected lifecycle states (active, paused, recently restarted)
- [ ] `agent_performance.json` remains readable after an abrupt shutdown or restart
- [ ] `/funds-status` avoids repeated small deficit requests and remains valid under partial RPC failures

---

## Phase 4 — Final CI/CD Check

Before handing off, run your full CI/CD pipeline one final time against your fork and confirm everything passes cleanly.

- [ ] Full CI/CD pipeline passes against the fork

---

## Phase 5 — Handoff to Valory

Once self-serve testing is complete, notify the Valory team. Share your fork and a summary of what was tested, including any known limitations or open questions.

Valory will then:

1. **Fork** your agent repository
2. **Audit & review** — security and code review of the agent
3. **Release** — create a release from the Valory-managed fork
4. **Pearl integration** — include the release in a Pearl update and ship to users
