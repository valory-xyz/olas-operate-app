# Frontend Integration Checklist

This checklist covers all frontend code changes required to integrate a new agent into [olas-operate-app](https://github.com/valory-xyz/olas-operate-app). It is used by the Pearl frontend team and by 3rd party teams raising a PR. Work through the steps in order. If the agent is on a new chain, complete Section 1 first.

---

## 1. New Chain Setup (skip if chain already supported)

Supported chains: Gnosis, Base, Mode, Optimism, Polygon. If the new agent runs on any of these, skip to Section 2.

> **Infrastructure**: coordinate with the infra team to add the RPC endpoint and update build scripts before starting.

- [ ] Add chain to `EvmChainIdMap` and `MiddlewareChainMap` in [constants/chains.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/chains.ts)
- [ ] Add chain image mapping to `CHAIN_IMAGE_MAP` in [constants/chains.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/chains.ts) and add the image to `frontend/public/chains/`
- [ ] Add RPC env var and safe creation threshold in [config/chains.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/chains.ts)
- [ ] Add token config (symbol, address, decimals) to [config/tokens.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/tokens.ts)
- [ ] Add `ServiceRegistryL2` and `ServiceRegistryTokenUtility` addresses to [config/olasContracts.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/olasContracts.ts)
- [ ] Create `frontend/config/stakingPrograms/{chain}.ts` following the pattern of [config/stakingPrograms/polygon.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/stakingPrograms/polygon.ts) and register it in [config/stakingPrograms/index.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/stakingPrograms/index.ts)
- [ ] Add a chain-level activity checker map to [config/activityCheckers.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/activityCheckers.ts)

---

## 2. Register the Agent

- [ ] Add the agent key to `AgentMap` in [constants/agent.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/agent.ts). The string value must match the internal name used by the middleware.

---

## 3. Staking Programs & Activity Checkers

- [ ] Add staking program ID(s) to [constants/stakingProgram.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/stakingProgram.ts)
- [ ] Add activity checker contract(s) to the correct chain map in [config/activityCheckers.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/activityCheckers.ts) — use the helper matching the ABI type (`getMechActivityCheckerContract`, `getRequesterActivityCheckerContract`, `getStakingActivityCheckerContract`, `getMemeActivityCheckerContract`, `getPetActivityCheckerContract`)
- [ ] Add staking program config(s) to the correct chain file in [config/stakingPrograms/](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/stakingPrograms/) with: address, OLAS staking requirement, `agentsSupported`, `mechType` (if applicable), `activityChecker`, and `MulticallContract`

---

## 4. Service Template

- [ ] Create `frontend/constants/serviceTemplates/service/{agentname}.ts` following the pattern of [constants/serviceTemplates/service/trader.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/serviceTemplates/service/trader.ts). Required fields:
  - `agentType`, `hash`, `service_version`, `agent_release` (repo + version tag)
  - `home_chain`, `configurations` (fund requirements + NFT IPFS hash per chain)
  - `env_variables` (with provision type: `USER` / `COMPUTED` / `FIXED`)
- [ ] Import the new template and add it to `SERVICE_TEMPLATES` in [constants/serviceTemplates/serviceTemplates.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/serviceTemplates/serviceTemplates.ts)
- [ ] Run `scripts/js/check_service_templates.ts` to validate

---

## 5. Agent Service Class

- [ ] Create `frontend/service/agents/{AgentName}.ts` extending `StakedAgentService`. Follow [service/agents/Polystrat.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/service/agents/Polystrat.ts) as a reference — implement `getAgentStakingRewardsInfo()`, `getAvailableRewardsForEpoch()`, `getServiceStakingDetails()`, and `getStakingContractDetails()` with the correct chain ID and default staking program.

---

## 6. Agent Config

- [ ] Add the agent entry to [config/agents.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/agents.ts). Required fields:
  - `name`, `evmHomeChainId`, `middlewareHomeChainId`, `agentIds`, `defaultStakingProgramId`
  - `serviceApi` (the class created in Step 5), `displayName`, `description`
  - `isAgentEnabled`, `requiresSetup`, `isX402Enabled`, `doesChatUiRequireApiKey`, `hasExternalFunds`, `servicePublicId`
  - Optional: `erc20Tokens`, `additionalRequirements`, `isGeoLocationRestricted`, `needsOpenProfileEachAgentRun` + alert, `category`, `defaultBehavior`, `isUnderConstruction`

---

## 7. Feature Flags

- [ ] Add an entry for the new agent in `FEATURES_CONFIG` in [hooks/useFeatureFlag.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/hooks/useFeatureFlag.ts). Set each flag (`withdraw-funds`, `staking-contract-section`, `backup-via-safe`, `bridge-onboarding`, `bridge-add-funds`, `on-ramp`) to `true` or `false` as agreed with the PM.

---

## 8. Onboarding Steps

- [ ] Add `{AGENTNAME}_ONBOARDING_STEPS` to [components/AgentIntroduction/constants.ts](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/components/AgentIntroduction/constants.ts). Each step has `title`, `desc`, and `imgSrc` (path to the image in `frontend/public/introduction/`). There is no fixed number of steps.
- [ ] Map the new agent type to its steps inside `AgentIntroduction.tsx`

---

## 9. Setup Wizard (only if `requiresSetup = true`)

- [ ] Create `frontend/components/SetupPage/SetupYourAgent/{AgentName}Form/{AgentName}Form.tsx` — the form component shown during first-time setup. Follow `PredictAgentForm` as a reference.
- [ ] Create `use{AgentName}FormValidate.ts` alongside the form for input validation.
- [ ] Register the new form in `SetupYourAgent.tsx`.

---

## 10. Visual Assets

- [ ] Agent icon: `frontend/public/agent-{agentType}-icon.png`
- [ ] Onboarding step images: `frontend/public/introduction/setup-agent-{agentType}-{n}.png` (one per step)

---

## 11. Verification

- [ ] `scripts/js/check_service_templates.ts` passes
- [ ] `yarn quality-check:frontend` passes (lint + typecheck)
- [ ] Agent appears in the agent selection list
- [ ] Agent icon and onboarding images load without 404
- [ ] Onboarding carousel shows all steps with correct text and images
- [ ] Geo-restriction dialog shows if `isGeoLocationRestricted = true`
- [ ] Setup wizard works and validates inputs (if `requiresSetup = true`)
- [ ] Funding step shows correct native token, ERC20, and OLAS amounts
- [ ] Staking section shows correct staking program(s)
- [ ] Feature flags behave as agreed
- [ ] Performance tab displays metrics from `agent_performance.json`

---

## Status

- [ ] Section 1 complete (new chain, if applicable)
- [ ] Sections 2–10 complete (all code changes merged)
- [ ] Section 11 complete (all checks pass)
- [ ] Integration live in Pearl
