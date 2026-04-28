You are performing an agent integration audit for the Pearl frontend codebase (olas-operate-app).

The agent type key to audit is: **$ARGUMENTS**

If no argument is provided, ask the user: "Please provide the agent type key (e.g. `polymarket_trader` — the key for the Polystrat agent). This is the snake_case value from the `AgentMap` enum in `frontend/constants/agent.ts`, not the display name. Known keys today: `trader` (PredictTrader), `memeooorr` (AgentsFun), `modius` (Modius), `optimus` (Optimus), `pett_ai` (PettAi), `polymarket_trader` (Polystrat)."

---

## Your task

Work through each section below. For every item, check whether it exists and is correctly implemented for the agent `$ARGUMENTS`. Output a final report grouped by section with a ✅ / ❌ / ⚠️ status for each item.

- ✅ = present and looks correct
- ❌ = missing or clearly wrong
- ⚠️ = present but needs manual review (e.g. values look like placeholders, or logic differs from other agents in a suspicious way)

At the end, output an **Overall status** with a summary sentence and a count of ✅ / ❌ / ⚠️.

---

## Section 1 — Agent registered in AgentMap

File: `frontend/constants/agent.ts`

- Read the file and check whether a key exists for `$ARGUMENTS` in the `AgentMap` enum.
- The string value of the key should match the internal middleware name (typically the same as the type key).

---

## Section 2 — Staking programs

File: `frontend/constants/stakingProgram.ts`
- Check whether any staking program IDs related to `$ARGUMENTS` exist.

Files: `frontend/config/stakingPrograms/` (all files)
- Check whether any staking program entry has `agentsSupported` that includes the `AgentMap` key for `$ARGUMENTS`.
- Confirm the entry contains: `address`, `requiredOlas` (or `olasStakingRequirement`), `agentsSupported`, `activityChecker`, `MulticallContract`.

File: `frontend/config/activityCheckers.ts`
- Check whether an activity checker entry exists for the agent's staking program(s).

---

## Section 3 — Service template

Directory: `frontend/constants/serviceTemplates/service/`
- Check whether a file exists for `$ARGUMENTS` (e.g. `{agentname}.ts` or similar).
- Read the file. Confirm it exports a service template object with: `agentType`, `hash`, `service_version`, `agent_release`, `home_chain`, `configurations`, `env_variables`.
- Check `env_variables` — every entry should have `name`, `description`, `provision_type`. `FIXED` entries should have a `value`. `USER` entries should NOT have a hardcoded value (that would be a bug).

File: `frontend/constants/serviceTemplates/serviceTemplates.ts`
- Check whether the new template is imported and included in the `SERVICE_TEMPLATES` array.

---

## Section 4 — Agent service class

Directory: `frontend/service/agents/`
- Check whether a file exists for `$ARGUMENTS`. The filename usually uses the PascalCase display name (not the snake_case agent key), e.g. `PredictTrader.ts`, `Modius.ts`, `PettAi.ts`, `Polystrat.ts`. **Watch for exceptions:** `AgentMap.AgentsFun` → `AgentsFunBase.ts` (with `shared-services/AgentsFun.ts` providing the actual class), and `AgentMap.Optimus` → `Optimism.ts` (filename is the chain, not the agent). If you cannot find a file by the obvious name, grep `frontend/service/agents/` for a class that `extends StakedAgentService` and references the agent's key.
- Read the file. Confirm it declares `export abstract class {AgentName}Service extends StakedAgentService` and implements the five abstract methods from `StakedAgentService`: `getAgentStakingRewardsInfo()`, `getAvailableRewardsForEpoch()`, `getServiceStakingDetails()`, `getStakingContractDetails()`, `getInstance()`.
- Note: `defaultStakingProgramId` lives on the agent config in `frontend/config/agents.ts` (covered in Section 5), **not** on the service class.

---

## Section 5 — Agent config

File: `frontend/config/agents.ts`
- Check whether the agent type `$ARGUMENTS` has an entry in `AGENT_CONFIG`.
- Read the entry. Confirm all required fields are present: `name`, `evmHomeChainId`, `middlewareHomeChainId`, `agentIds`, `defaultStakingProgramId`, `serviceApi`, `displayName`, `description`, `isAgentEnabled`, `requiresSetup`, `isX402Enabled`, `doesChatUiRequireApiKey`, `hasExternalFunds`, `servicePublicId`.
- Flag if `isAgentEnabled` is `false` (it may be intentionally disabled but worth noting).
- Flag if `agentIds` is empty or contains placeholder values like `0` or `[]`.

---

## Section 6 — Feature flags

File: `frontend/hooks/useFeatureFlag.ts`
- Check whether the agent's `AgentMap` key has an entry in `FEATURES_CONFIG`.
- Confirm all four flags are set (boolean, not undefined): `withdraw-funds`, `backup-via-safe`, `bridge-onboarding`, `on-ramp`. (If the canonical flag list in the `FeatureFlagsSchema` enum has grown since this command was last updated, cross-check there and audit whatever enum currently defines — the audit should reflect the live schema.)

---

## Section 7 — Onboarding steps

File: `frontend/components/AgentIntroduction/constants.ts`
- Check whether a constant like `{AGENTNAME}_ONBOARDING_STEPS` exists.
- Confirm each step has `title`, `desc`, and `imgSrc`.

File: `frontend/components/AgentIntroduction/AgentIntroduction.tsx` (or similar)
- Check whether the new agent type is mapped to its onboarding steps.

---

## Section 8 — Setup wizard (only if requiresSetup = true)

Check the `requiresSetup` value from Section 5. If `false`, mark this section as N/A.

If `true`:
- Check whether a form directory exists at `frontend/components/SetupPage/SetupYourAgent/` matching the agent name.
- Check whether a validation hook (`use{AgentName}FormValidate.ts`) exists alongside the form.
- Check whether the form is registered in `SetupYourAgent.tsx`.

---

## Section 9 — Visual assets

Directory: `frontend/public/`
- Check whether `agent-{agentType}-icon.png` exists.

Directory: `frontend/public/introduction/`
- Check whether `setup-agent-{agentType}-1.png` exists (and any additional step images referenced in the onboarding steps from Section 7).
- Flag any `imgSrc` values in the onboarding steps that reference a file not found on disk.

---

## Section 10 — New chain (if applicable)

Read the `evmHomeChainId` from the agent config. Check whether it is one of the known supported chains (Gnosis=100, Base=8453, Mode=34443, Optimism=10, Polygon=137).

If NOT one of those:
- Check `frontend/constants/chains.ts` for the chain in `EvmChainIdMap`, `MiddlewareChainMap`, `CHAIN_IMAGE_MAP`.
- Check `frontend/config/chains.ts` for the chain's RPC env var.
- Check `frontend/config/tokens.ts` for chain-specific token config.
- Check `frontend/config/olasContracts.ts` for `ServiceRegistryL2` and `ServiceRegistryTokenUtility`.
- Check `frontend/public/chains/` for a chain image asset.

If it IS one of the known chains, mark this section as N/A.

---

## Section 11 — Code quality hints (cannot run, flag for manual check)

Mark these as ⚠️ always (they require running commands locally):

- `scripts/js/check_service_templates.ts` — validates service template schema
- `yarn quality-check:frontend` — lint + typecheck

---

## Output format

Use this structure:

```
## Agent Integration Audit: {agentType}

### Section 1 — AgentMap
✅ Key `{key}` found in AgentMap with value `"{value}"`

### Section 2 — Staking Programs
✅ Staking program IDs found: [...]
✅ Staking program config found in {chain}.ts with correct fields
❌ No activity checker found for {programId}

### Section 3 — Service Template
...

### Section 4 — Agent Service Class
...

### Section 5 — Agent Config
...

### Section 6 — Feature Flags
...

### Section 7 — Onboarding Steps
...

### Section 8 — Setup Wizard
N/A (requiresSetup = false)

### Section 9 — Visual Assets
✅ agent-{agentType}-icon.png found
❌ setup-agent-{agentType}-1.png not found

### Section 10 — New Chain
N/A (chain 8453 is already supported)

### Section 11 — Code Quality
⚠️ Run `scripts/js/check_service_templates.ts` manually
⚠️ Run `yarn quality-check:frontend` manually

---

## Overall Status
❌ 2 items missing, 2 need manual review, 14 passed.

Missing items:
- Activity checker for {programId} in activityCheckers.ts
- setup-agent-{agentType}-1.png in frontend/public/introduction/
```
