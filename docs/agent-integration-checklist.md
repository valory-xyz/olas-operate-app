# Agent Integration Checklist

This is the complete guide for integrating an agent into the OLAS ecosystem and making it available in Pearl. It covers the full journey in chronological order: build → package → deploy on-chain → middleware → Pearl frontend.

**Works for:** brand new agents and existing agents being integrated for the first time.
**Who does it:** the agent team, with Pearl team review at Phases 4 and 5.

> **New chain?** If your agent runs on a chain not yet supported in Pearl (currently: Gnosis, Base, Mode, Optimism, Polygon), contact the Pearl team before starting Phase 5. Chain-level infrastructure will be handled internally by the Pearl team.

> **Stuck at any point?** Reach out to PM Iason Rovis — iason.rovis@valory.xyz, or open an issue at [github.com/valory-xyz/olas-operate-app/issues](https://github.com/valory-xyz/olas-operate-app/issues).

---

## Overview

The integration spans four layers. Each layer depends on the one before it — do not move to the next until the current one is complete.

```
┌─────────────────────────────┐
│   1. Your Agent Repository  │  ← Phases 0–2  (build, package, publish)
└──────────────┬──────────────┘
               │ agent built, packaged, binaries published
               ▼
┌─────────────────────────────┐
│     2. On-chain Setup        │  ← Phase 3  (Olas Registry + staking contracts)
└──────────────┬──────────────┘
               │ contracts deployed, hashes noted
               ▼
┌─────────────────────────────┐
│  3. olas-operate-middleware  │  ← Phase 4  (staking contract registration)
└──────────────┬──────────────┘
               │ middleware PR merged, commit hash noted
               ▼
┌─────────────────────────────┐
│    4. olas-operate-app       │  ← Phase 5  (Pearl frontend integration)
└─────────────────────────────┘
```

---

## Phase 0 — Prerequisites

Confirm these before writing any code:

- [ ] Agent will run on one of the supported EVM chains listed above
- [ ] Agent development framework chosen:
  - **Regular Open Autonomy** — packages + FSM app, see [stack.olas.network/open-autonomy](https://stack.olas.network/open-autonomy/)
  - **Olas SDK** — external agent wrapped in a minimal Open Autonomy agent, see [stack.olas.network/olas-sdk](https://stack.olas.network/olas-sdk/)
- [ ] Agent business logic complete and tested locally

---

## Phase 1 — Build the Agent

The agent must implement a set of standard interfaces so Pearl can manage, monitor, and display it correctly.

### 1.1 Persistent Storage

- [ ] Agent uses the directory set by the `STORE_PATH` env var for all persistent data it manages
- [ ] Agent saves state periodically and recovers cleanly after receiving a `SIGKILL` signal

### 1.2 Keys & Safe Address

- [ ] Agent reads `ethereum_private_key.txt` from its working directory (contains the Agent EOA private key)
- [ ] Agent reads the `SAFE_CONTRACT_ADDRESSES` env var (comma-separated safe addresses on relevant chains)

### 1.3 Logging

- [ ] Agent produces a `log.txt` file in its working directory
- [ ] Log lines follow the format: `[YYYY-MM-DD HH:MM:SS,mmm] [LOG_LEVEL] [agent] message`

### 1.4 Healthcheck Interface

- [ ] Agent exposes `GET http://127.0.0.1:8716/healthcheck`
- [ ] Response JSON includes `is_healthy` (boolean)
- [ ] Response JSON includes `rounds` — current and previous round names (e.g. `{"current": "CollectObservationRound", "previous": "RegistrationRound"}`); Pearl displays this to show the user what the agent is currently doing

> **Recommended:** also include `seconds_since_last_transition` and other observability fields — these are not required but make debugging significantly easier.

### 1.5 Agent UI (optional)

If the agent has an embedded interface shown inside Pearl:

- [ ] Agent exposes `GET http://127.0.0.1:8716/` — can return HTML with `Content-Type: text/html`
- [ ] Agent handles `POST` requests to that endpoint if real-time communication is needed

### 1.6 Funding Status Interface

Pearl polls this endpoint when the service is in `DEPLOYED` state. If the agent reports a non-zero deficit, Pearl prompts the user to approve a top-up transfer. A 5-minute cooldown applies after each successful transfer.

- [ ] Agent exposes `GET http://127.0.0.1:8716/funds-status`
- [ ] Returns HTTP 200 on success; any other status code is treated as a failure
- [ ] Only the agent's own EOA and Safe addresses are reported — requests for any other address are ignored by middleware
- [ ] Deficit uses a "fixed threshold and topup" strategy: if `balance < threshold`, set `deficit = topup - balance`; as a rule of thumb `topup >= 2 × threshold` to avoid repeated small requests

Response is keyed by chain (lowercase) → checksummed address (EOA or Safe) → asset address → `{balance, deficit, decimals}`. All values are strings in the smallest token unit. Native token uses the zero address; ERC20 tokens use their contract address. Return `{}` when no funds are needed.

```json
{
  "base": {
    "0xC9FE...AgentEOA": {
      "0x0000000000000000000000000000000000000000": {
        "balance": "80000000000000",
        "deficit": "120000000000000",
        "decimals": "18"
      }
    },
    "0x5E25...Safe": {
      "0x0b2C...USDC": {
        "balance": "0",
        "deficit": "10000000",
        "decimals": "6"
      }
    }
  }
}
```

> **Recommended:** read fund requirements from an environment variable rather than hardcoding them, so values can be adjusted from Pearl without a code change.

### 1.7 Environment Variables

- [ ] Agent uses the standard RPC env vars provided by Pearl where needed: `ETHEREUM_LEDGER_RPC`, `GNOSIS_LEDGER_RPC`, `BASE_LEDGER_RPC`, `MODE_LEDGER_RPC`, `OPTIMISM_LEDGER_RPC`, `POLYGON_LEDGER_RPC`
- [ ] Every env var the agent uses is declared in the service template JSON with a provision type (`USER` / `COMPUTED` / `FIXED`)
- [ ] The same env vars are listed in `service.yaml` and accessed by the agent using the prefix `CONNECTION_CONFIGS_CONFIG_<variable_name>`

### 1.8 Security

- [ ] Source code meets [OWASP Developer Guide](https://owasp.org/www-project-developer-guide/) and [CWE Top 25](https://cwe.mitre.org/top25/) standards

### 1.9 Withdrawal (only if agent invests or manages external funds)

- [ ] Agent handles `WITHDRAWAL_MODE=true` env var to withdraw all invested funds back to the Agent Safe before stopping

### 1.10 Open Autonomy — Additional Requirements (skip if using Olas SDK)

- [ ] Agent uses the Open Autonomy version compatible with the current Pearl repository
- [ ] Source code contains only ASCII printable characters (range 32–126)
- [ ] Repository passes standard linters: Isort, Black, Mypy, Bandit
- [ ] All dev packages pushed via `autonomy push-all` — note the resulting IPFS hash

### 1.11 Performance Reporting

Pearl displays agent metrics in the Performance tab. Agents must write an `agent_performance.json` file at the path defined by the `CONNECTION_CONFIGS_CONFIG_STORE_PATH` env var.

**Required fields:**

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | integer or null | UNIX timestamp (UTC) of last update. `null` if agent has not run yet. |
| `metrics` | array | KPI metrics. Recommended: 0–2 items (1 primary, 1 secondary). Each item requires: `name` (string), `is_primary` (boolean), `description` (string or null — HTML allowed, shown as tooltip), `value` (string). |
| `agent_behavior` | string or null | Free-text description of the agent's current strategy or behavior. |
| `last_activity` | string or null | Include as `null` if unused. |
| `last_chat_message` | string or null | Include as `null` if unused. |

Additional top-level keys (`agent_details`, `prediction_history`, `profit_over_time`, etc.) are allowed and encouraged for a richer UI experience.

**Example — no activity yet (initial state):**
```json
{
  "timestamp": null,
  "metrics": [],
  "last_activity": null,
  "last_chat_message": null,
  "agent_behavior": null
}
```

**Example — agent running with metrics:**
```json
{
  "timestamp": 1753973735,
  "metrics": [
    {
      "name": "Total ROI",
      "is_primary": true,
      "description": "Total return on investment including staking rewards.",
      "value": "12%"
    },
    {
      "name": "Prediction accuracy",
      "is_primary": false,
      "description": null,
      "value": "55.9%"
    }
  ],
  "agent_behavior": "Balanced strategy that spreads predictions, limits risk, and aims for consistent wins."
}
```

**Implementation requirements:**

- [ ] File is created at startup with null/empty defaults if it does not exist
- [ ] `timestamp` and `metrics` are updated at the end of each agent activity cycle
- [ ] File path is read from `CONNECTION_CONFIGS_CONFIG_STORE_PATH` (do not hardcode the path)

---

## Phase 2 — Package the Agent

- [ ] Agent repository contains `packages/packages.json` with the service IPFS hash — see [example](https://github.com/valory-xyz/trader/blob/main/packages/packages.json#L26)
- [ ] Repository has a GitHub Actions workflow that builds binaries on each release — see [example](https://github.com/valory-xyz/trader/blob/main/.github/workflows/release.yaml#L149-L284)
- [ ] Binaries built for all supported platforms using the naming convention `agent_runner_{os}_{arch}` (add `.exe` for Windows):
  - `agent_runner_linux_x64`
  - `agent_runner_macos_x64`
  - `agent_runner_macos_arm64`
  - `agent_runner_windows_x64.exe`
  - `agent_runner_windows_arm64.exe`
- [ ] Binaries are uploaded to GitHub release artifacts and downloadable from the release page
- [ ] Repository is public or access granted to Valory so it can be forked

---

## Phase 3 — On-chain Setup

- [ ] All agent components (excluding the service itself) minted on the [Olas Registry](https://marketplace.olas.network/ethereum/ai-agents) — note the **agent ID(s)**
- [ ] Service package published to IPFS — note the **service hash**
- [ ] Staking contract(s) deployed on-chain — note the **chain**, **contract address(es)**, and **OLAS staking requirement per tier** (e.g. 100 OLAS for tier 1, 1000 OLAS for tier 2)
- [ ] Activity checker contract deployed — note the **contract address** and the **ABI type** it uses (Mech / Requester / Staking / Meme / Pet)
- [ ] NFT IPFS hash available — this is the IPFS hash of the on-chain NFT that represents the agent service registration; it goes into the `configurations.nft` field of the service template

---

## Phase 4 — Middleware Integration

Open a PR on [olas-operate-middleware](https://github.com/valory-xyz/olas-operate-middleware) from the `main` branch:

- [ ] Add the staking contract to [`operate/ledger/profiles.py`](https://github.com/valory-xyz/olas-operate-middleware/blob/df4e440fccff4364321ffec6b97f6939792c14f6/operate/ledger/profiles.py#L62) — use the same name that will be used in the Pearl frontend
- [ ] (Optional) Add to [`operate/quickstart/run_service.py`](https://github.com/valory-xyz/olas-operate-middleware/blob/df4e440fccff4364321ffec6b97f6939792c14f6/operate/quickstart/run_service.py#L74) if the agent should be available via quickstart

Once the PR is merged, **note the commit hash** — it is required for Phase 5, step 11.

---

## Phase 5 — Pearl Frontend Integration

Open a PR on [olas-operate-app](https://github.com/valory-xyz/olas-operate-app) against the `staging` branch.

> **Two paths:** You can either make the code changes below yourself and raise a PR, or open an issue at [github.com/valory-xyz/olas-operate-app/issues](https://github.com/valory-xyz/olas-operate-app/issues) with all the information from section 5.2 and let the Pearl team raise the PR on your behalf.

### 5.1 New Chain Setup (skip if chain is already supported)

If the agent's chain is not yet in Pearl, contact the Pearl team first (iason.rovis@valory.xyz) — chain infrastructure also requires changes outside the repository such as RPC endpoints and build scripts. Complete this before gathering information or making any agent-specific code changes.

- [ ] Add chain to `EvmChainIdMap` and `MiddlewareChainMap` in [`frontend/constants/chains.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/chains.ts) and add the chain image to `frontend/public/chains/`
- [ ] Add RPC env var and safe creation threshold in [`frontend/config/chains.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/chains.ts)
- [ ] Add token config (symbol, address, decimals) to [`frontend/config/tokens.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/tokens.ts)
- [ ] Add `ServiceRegistryL2` and `ServiceRegistryTokenUtility` addresses to [`frontend/config/olasContracts.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/olasContracts.ts)
- [ ] Create `frontend/config/stakingPrograms/{chain}.ts` following the pattern in [`polygon.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/stakingPrograms/polygon.ts) and register it in [`index.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/stakingPrograms/index.ts)
- [ ] Add chain-level activity checker map to [`frontend/config/activityCheckers.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/activityCheckers.ts)

### 5.2 Gather Required Information

Collect all of this before touching any code. If raising the PR yourself, you will use these values directly in the code changes. If handing off to the Pearl team, share this filled-in section with them.

**Identity**

- [ ] Display name shown in the UI (e.g. "Polystrat")
- [ ] Short description — one sentence shown on the agent selection card
- [ ] Category — optional, free-text label shown on the agent card (e.g. `Prediction Markets`, `DeFi`; new categories can be added)
- [ ] Default behavior string — optional, shown in the Performance tab alongside `agent_behavior`
- [ ] Service public ID — Olas Registry identifier (e.g. `valory/trader`)
- [ ] Agent type key — snake_case internal name matching the middleware (e.g. `polymarket_trader`)

**Service Template**

- [ ] Service IPFS hash (from Phase 3)
- [ ] Service version string (e.g. `v0.31.7`) — provide your current version as a reference; the final version will be assigned by Valory when they fork your repository and create a release
- [ ] Agent release GitHub repository and version tag
- [ ] Full list of environment variables — for each: name, description, provision type (`USER` / `COMPUTED` / `FIXED`), and default value for `FIXED` vars
- [ ] Fund requirements per chain — native token amounts for agent wallet and safe wallet, plus any ERC20 token and amount
- [ ] NFT IPFS hash (from Phase 3)

**Tokens**

- [ ] For each ERC20 token the agent requires on its chain: token symbol, contract address, decimals — only needed if the token is not already configured for that chain in the repository

**Agent Flags**

These flags control how Pearl handles the agent. Confirm the correct value for each with the Pearl PM.

- [ ] `requiresSetup` — does the user need to enter API keys or config during first-time setup? If yes, list each input field: label, placeholder, and validation rule.
- [ ] `isGeoLocationRestricted` — should a geo-restriction warning appear in certain regions? If yes, provide the list of regions/countries in the PR description
- [ ] `hasExternalFunds` — does the agent hold funds in external protocols (not only in the agent/safe wallet)?
- [ ] `isX402Enabled` — does the agent use the X402 payment protocol?
- [ ] `doesChatUiRequireApiKey` — does the embedded chat UI require a user-provided API key?
- [ ] `needsOpenProfileEachAgentRun` — must the user open an external URL each run (e.g. a pet profile page)? If yes, provide the alert title and message.

**Feature Flags** — agree with the Pearl PM on `true` / `false` for each:

| Flag | Description |
|------|-------------|
| `withdraw-funds` | Enables withdrawing funds from the wallet |
| `staking-contract-section` | Shows staking contract management UI |
| `backup-via-safe` | Enables wallet backup via Safe (set to `false` if chain not supported by Safe) |
| `bridge-onboarding` | Enables bridge flow during initial setup |
| `bridge-add-funds` | Enables bridge flow in low-balance alerts |
| `on-ramp` | Enables fiat on-ramp (buy crypto) flow |

**Visual Assets**

- [ ] Agent icon — PNG, 64×64 px, filename: `agent-{agentType}-icon.png`
- [ ] Onboarding step images — one PNG per step (any number of steps), filename: `setup-agent-{agentType}-{n}.png`
- [ ] Onboarding copy — for each step: a short title and a one-sentence description

### 5.3 Code Changes

Work through these steps in order:

- [ ] **1. Register agent type** — add the agent key to `AgentMap` in [`frontend/constants/agent.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/agent.ts). The string value must match the internal name used by the middleware.
- [ ] **2. Staking program IDs** — add program ID constant(s) to [`frontend/constants/stakingProgram.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/stakingProgram.ts)
- [ ] **3. Activity checkers** — add entries to the correct chain map in [`frontend/config/activityCheckers.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/activityCheckers.ts) using the helper that matches the ABI type you noted in Phase 3: `getMechActivityCheckerContract`, `getRequesterActivityCheckerContract`, `getStakingActivityCheckerContract`, `getMemeActivityCheckerContract`, or `getPetActivityCheckerContract`
- [ ] **4. Staking program configs** — add entries to the correct chain file in [`frontend/config/stakingPrograms/`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/stakingPrograms/) with: contract address, OLAS staking requirement, `agentsSupported`, `activityChecker`, `mechType` (if applicable), and `MulticallContract`
- [ ] **5. Service template** — create `frontend/constants/serviceTemplates/service/{agentname}.ts` following [`trader.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/serviceTemplates/service/trader.ts), then import it and add it to `SERVICE_TEMPLATES` in [`serviceTemplates.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/serviceTemplates/serviceTemplates.ts). See the [service config guide](https://github.com/valory-xyz/quickstart/?tab=readme-ov-file#guide-for-the-service-configjson) for field definitions.
- [ ] **6. Agent service class** — create `frontend/service/agents/{AgentName}.ts` extending `StakedAgentService`, following [`Polystrat.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/service/agents/Polystrat.ts) as a reference
- [ ] **7. Agent config** — add entry to [`frontend/config/agents.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/agents.ts). See the `AgentConfig` type in [`frontend/types/Agent.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/types/Agent.ts) for all available fields. **Set `isAgentEnabled: true`** — without this the agent will not appear in Pearl.
- [ ] **8. Feature flags** — add entry for the new agent in `FEATURES_CONFIG` in [`frontend/hooks/useFeatureFlag.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/hooks/useFeatureFlag.ts) using the decisions from 5.2
- [ ] **9. Onboarding steps** — add `{AGENTNAME}_ONBOARDING_STEPS` to [`frontend/components/AgentIntroduction/constants.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/components/AgentIntroduction/constants.ts) and map the agent type to its steps in `AgentIntroduction.tsx`. Each step has `title`, `desc`, and `imgSrc`. Any number of steps is supported.
- [ ] **10. Setup wizard** (only if `requiresSetup = true`) — create form component + validation hook under `frontend/components/SetupPage/SetupYourAgent/` following `PredictAgentForm` as a reference, then register it in `SetupYourAgent.tsx`
- [ ] **11. Update middleware dependency** — in [`pyproject.toml`](https://github.com/valory-xyz/olas-operate-app/blob/main/pyproject.toml), pin `olas-operate-middleware` to the commit hash noted at the end of Phase 4:
  ```
  olas-operate-middleware = {git = "https://github.com/valory-xyz/olas-operate-middleware.git", rev = "<commit_hash>"}
  ```
- [ ] **12. Visual assets** — add icon to `frontend/public/agent-{agentType}-icon.png` and step images to `frontend/public/introduction/setup-agent-{agentType}-{n}.png`

### 5.4 Validate Before Opening PR

- [ ] `scripts/js/check_service_templates.ts` passes with no errors
- [ ] `yarn quality-check:frontend` passes (lint + typecheck)

### 5.5 PR Description

Include the following in your PR description so reviewers can verify the integration:

- [ ] Agent name, icon, and one-sentence description
- [ ] Brief description of what the agent does and how it operates (business logic and running flow)
- [ ] Home chain and staking program(s) with contract addresses
- [ ] Restricted regions/countries (if `isGeoLocationRestricted = true`)
- [ ] Screenshots or a screen recording of the onboarding flow and agent running in Pearl

---

## Phase 6 — Self-Serve Testing

Before notifying Valory that the integration is ready, you must test your agent end-to-end in a real Pearl environment. Valory will create a Pearl test branch that includes your agent — this is your testing environment.

### 6.1 CI/CD Readiness

- [ ] Release binaries built for all supported target platforms and available as release artifacts
- [ ] Linting, type checking, and security checks passing in CI
- [ ] Unit and integration tests passing in CI

### 6.2 Set Up Your Test Environment

Once Phase 5 PR is submitted, notify Valory (iason.rovis@valory.xyz) so they can prepare a test branch that includes your agent.

- [ ] Wait for Valory to notify you that your Pearl test branch is ready
- [ ] Fork that branch into your own repository
- [ ] Build and run Pearl locally from your fork
- [ ] Confirm your agent appears in the agent selection list

### 6.3 Wallet & Funding

- [ ] Full onboarding flow from a fresh state completes without errors
- [ ] Pearl Signer is funded correctly with the required gas token for your network
- [ ] Pearl Safe is created automatically once all required funds are received
- [ ] Funds move from Signer to Safe as expected
- [ ] Correct token type is required and surfaced in the UI
- [ ] Insufficient funds and wrong token type error states are handled correctly

### 6.4 Agent Lifecycle

- [ ] Agent starts successfully
- [ ] Agent stops cleanly and resumes correctly after a restart
- [ ] No stuck states or unexpected errors during normal operation
- [ ] Healthcheck `rounds` field updates correctly and shows the current agent round in Pearl
- [ ] Performance tab displays live metrics from `agent_performance.json` with correct names and values
- [ ] Agent UI is accessible and works as expected (if applicable)

### 6.5 Staking & Rewards (if applicable)

- [ ] Rewards display correctly after agent activity
- [ ] User can unstake and withdraw cleanly

### 6.6 Edge Cases & Error Handling

- [ ] RPC failures are handled gracefully — agent retries or surfaces a clear error
- [ ] Mid-run stop and restart completes without data loss
- [ ] Withdrawal flow works correctly from all expected lifecycle states (active, paused, recently restarted)
- [ ] `agent_performance.json` remains readable after an abrupt shutdown or restart
- [ ] `/funds-status` avoids repeated small deficit requests and remains valid under partial RPC failures

### 6.7 Handoff to Valory

Once all tests pass, notify the Valory team. Share your fork and a summary of what was tested, including any known limitations or open questions.

Valory will then:

1. **Fork** your agent repository
2. **Audit & review** — security and code review of the agent
3. **Release** — create a release from the Valory-managed fork
4. **Pearl integration** — include the release in a Pearl update and ship to users

---

## Final Verification

**Run by: Pearl team after deployment.** Go through these once the agent is live in Pearl to confirm the full integration is correct end-to-end.

- [ ] Agent appears in the agent selection list during setup
- [ ] Agent icon and all onboarding images load without 404
- [ ] Onboarding carousel displays all steps with correct images and copy
- [ ] Geo-restriction dialog appears if `isGeoLocationRestricted = true`
- [ ] Setup wizard appears, accepts input, and validates correctly (if `requiresSetup = true`)
- [ ] Funding step shows correct amounts — native token, ERC20 (if applicable), and OLAS
- [ ] Agent starts successfully and the main dashboard loads
- [ ] Healthcheck `rounds` field is visible and reflects the agent's current round
- [ ] Staking section shows the correct staking program(s) and OLAS requirements
- [ ] Feature flags behave as agreed with the PM
- [ ] Performance tab displays metrics from `agent_performance.json` with correct names and values
- [ ] When agent wallet balance drops below threshold, Pearl prompts the user to top up (via `/funds-status`)
- [ ] `GET http://127.0.0.1:8716/healthcheck` returns `is_healthy: true` when agent is running

---

## Status Tracking

- [ ] Phase 0 — Prerequisites confirmed
- [ ] Phase 1 — Agent built and all interfaces implemented (including performance reporting)
- [ ] Phase 2 — Binaries packaged and published
- [ ] Phase 3 — On-chain setup complete (contracts deployed, registry entries created)
- [ ] Phase 4 — Middleware PR merged
- [ ] Phase 5 — Pearl frontend PR merged and validated
- [ ] Phase 6 — Self-serve testing complete, handoff to Valory done
- [ ] Final verification passed
- [ ] Integration live in Pearl

---

For questions, contact PM Iason Rovis — iason.rovis@valory.xyz, or open an issue at [github.com/valory-xyz/olas-operate-app/issues](https://github.com/valory-xyz/olas-operate-app/issues).
