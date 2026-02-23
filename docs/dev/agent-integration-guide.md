# Agent Integration Guide

This document is the source of truth for integrating a new agent into the Olas Operate App. It is written against the current repository layout and code paths.

## Overview

Integrating a new agent touches configuration, service templates, staking programs, UI onboarding, assets, and Electron store. Use this guide as a checklist to avoid missing hidden dependencies.

## Required Inputs From Agent or Middleware Teams

Collect these before you start:

1. Service template hash and `service_version`.
2. Agent release repo coordinates: owner, repo, version, and whether it is AEA.
3. Middleware agent ID(s), service public ID, and NFT hash.
4. Home chain and any additional operating chains.
5. Staking program IDs, contract addresses, staking requirements, and activity checker addresses.
6. Mech configuration and mech contract addresses if the agent uses Mech tooling.
7. Funding requirements by token address for both agent and safe.
8. Required environment variables (user-provided, fixed, computed).
9. Onboarding copy and images.
10. Agent icon.
11. Geo-restriction status and any related messaging.

## 1. Agent Identity

**File:** `frontend/constants/agent.ts`

1. Add the agent to `AgentMap`.
2. The map value is the stable identifier used in assets and backend payloads.
3. The map key is the UI-facing identifier used throughout the frontend.

**File:** `frontend/config/agents.ts`

1. Add a new `AgentConfig` entry with:
2. `servicePublicId` and `middlewareHomeChainId` aligned to middleware.
3. `agentIds`, `defaultStakingProgramId`, and `serviceApi`.
4. `isAgentEnabled`, `isUnderConstruction`, `isComingSoon`, and `requiresSetup`.
5. `isX402Enabled` and `doesChatUiRequireApiKey`.
6. `additionalRequirements` for non-native funding tokens.
7. `isGeoLocationRestricted` if needed.
8. If the agent should be excluded from provider initialization, set `isAgentEnabled` to false. `frontend/config/providers.ts` filters providers based on enabled agents.

**File:** `frontend/types/Agent.ts`

1. Add the new service class to the `ServiceApi` union if you add a new service API class.

**File:** `electron/store.js`

1. Add the agent key to the store schema using the `AgentMap` value.

**File:** `frontend/types/ElectronApi.ts`

1. Add the agent key to `ElectronStore` so the renderer has typed access.

## 2. Service Template

**Files:**
1. `frontend/constants/serviceTemplates/serviceTemplates.ts`
2. `frontend/constants/serviceTemplates/service/*.ts`
3. `frontend/constants/serviceTemplates/constants.ts`

Define a `ServiceTemplate` entry that includes:

1. `agentType` set to the `AgentMap` value.
2. `name` unique across all services.
3. `hash`, `service_version`, and `agent_release`.
4. `description` should include `KPI_DESC_PREFIX` from `frontend/constants/serviceTemplates/constants.ts`.
5. `image` pointing to a stable URL or local asset.
6. `home_chain` as a supported middleware chain.
7. `configurations` with:
8. `staking_program_id` for defaults.
9. `nft`, `agent_id`, `cost_of_bond`, and `fund_requirements`.
10. `rpc` can be placeholder and is overwritten at creation time.
11. `env_variables` with `FIXED`, `USER`, and `COMPUTED` provisioning types.
12. Add the template to `SERVICE_TEMPLATES`.

**Notes:**
1. `ServicesService.createService` overwrites `rpc` and `staking_program_id` per chain using `CHAIN_CONFIG`. Do not hardcode RPCs in the template.
2. `updateServiceIfNeeded` will enforce `KPI_DESC_PREFIX`, env variables, and agent release updates. Keep template values accurate.
3. Run `scripts/js/check_service_templates.ts` to validate service hashes and release binaries.

## 3. Staking Programs

**Files:**
1. `frontend/constants/stakingProgram.ts`
2. `frontend/config/stakingPrograms/index.ts`
3. `frontend/config/stakingPrograms/<chain>.ts`
4. `frontend/config/activityCheckers.ts`

Steps:

1. Add new staking program IDs to `STAKING_PROGRAM_IDS`.
2. Add program config in the chain-specific file with:
3. `chainId`, `name`, `agentsSupported`, and `stakingRequirements`.
4. `address` and `contract` for the staking proxy.
5. `activityChecker` for the program.
6. `mechType` and `mech` if the program uses a mech.
7. Mark deprecated programs with `deprecated: true` if needed.

## 4. Chain Support (Only if New Chain)

**Files:**
1. `frontend/constants/chains.ts`
2. `frontend/utils/middlewareHelpers.ts`
3. `frontend/config/chains.ts`
4. `frontend/config/tokens.ts`
5. `frontend/config/olasContracts.ts`
6. `frontend/constants/urls.ts`
7. `frontend/next.config.mjs`
8. `electron/utils/env-validation.js`

Update or add:

1. `EvmChainIdMap`, `EvmChainName`, `MiddlewareChainMap`, and `SupportedMiddlewareChainMap`.
2. `CHAIN_IMAGE_MAP` and add chain image assets in `frontend/public/chains` and `electron/public/chains`.
3. `asEvmChainId`, `asMiddlewareChain`, and `asEvmChainDetails` in `frontend/utils/middlewareHelpers.ts`.
4. `CHAIN_CONFIG` with `rpc` env variable and `safeCreationThreshold`.
5. Token configs in `frontend/config/tokens.ts`.
6. `OLAS_CONTRACTS` addresses in `frontend/config/olasContracts.ts`.
7. `REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN` in `frontend/constants/urls.ts`.
8. Explorer and blockscout mappings in `frontend/constants/urls.ts`.
9. Add the RPC env variable to `frontend/next.config.mjs`.
10. Add validation in `electron/utils/env-validation.js`.

## 5. Tokens and Funding Requirements

**Files:**
1. `frontend/config/tokens.ts`
2. `frontend/hooks/useInitialFundingRequirements.ts`
3. `frontend/utils/wallet.ts`

Notes:

1. Add token addresses and decimals to `TOKEN_CONFIG`.
2. Add icons to `TokenSymbolConfigMap` and assets to `frontend/public/tokens` and `electron/public/tokens`.
3. If the agent needs extra funding tokens, add `additionalRequirements` in `AGENT_CONFIG`.
4. If bridging uses a new bridged token, add it to `BRIDGED_TOKEN_SOURCE_MAP` in `frontend/utils/wallet.ts`.

## 6. Mechs

**File:** `frontend/config/mechs.ts`

1. Add mech contracts per chain in `MECHS`.
2. Use `MechType` values to align with staking program config.

## 7. Service API Class

**Files:**
1. `frontend/service/agents/<Agent>.ts`
2. `frontend/service/agents/shared-services/*.ts`

Steps:

1. Add a new class extending `StakedAgentService` or an existing shared service.
2. Implement or delegate:
3. `getAgentStakingRewardsInfo`
4. `getAvailableRewardsForEpoch`
5. `getServiceStakingDetails`
6. `getStakingContractDetails`
7. The default `getStakingProgramIdByAddress` is inherited from `StakedAgentService`.
8. Wire the new class into `AGENT_CONFIG.serviceApi`.

## 8. Onboarding and Setup UI

**Files:**
1. `frontend/components/AgentIntroduction/constants.ts`
2. `frontend/components/AgentIntroduction/AgentIntroduction.tsx`
3. `frontend/components/SetupPage/SetupYourAgent/SetupYourAgent.tsx`
4. `frontend/components/SetupPage/SetupYourAgent/*`
5. `frontend/components/SetupPage/AgentOnboarding/*`

Steps:

1. Add onboarding steps to `frontend/components/AgentIntroduction/constants.ts`.
2. Add the steps to the `onboardingStepsMap` in `AgentIntroduction.tsx`.
3. If `requiresSetup` is true and `isX402Enabled` is false, create a setup form.
4. Wire that form into `SetupYourAgent.tsx`.
5. Setup forms typically override `serviceTemplate.env_variables` and call `onDummyServiceCreation`.
6. For Agents.Fun, `service.description` must include `@username` because `frontend/utils/x.ts` parses it.

Geo restrictions:

1. Set `isGeoLocationRestricted` in `AGENT_CONFIG`.
2. The UI uses `GEO_ELIGIBILITY_API_URL` from `frontend/constants/urls.ts`.
3. `RestrictedRegion` currently hardcodes Polymarket wording, so update it if a different agent needs restriction messaging.

## 9. X402

**Files:**
1. `frontend/constants/x402.ts`
2. `frontend/constants/serviceTemplates/serviceTemplates.ts`
3. `frontend/constants/serviceTemplates/service/*.ts`

Steps:

1. Add the agent to `X402_ENABLED_FLAGS`.
2. Set `env_variables.USE_X402` in the service template.
3. If `isX402Enabled` is true, setup forms are skipped and onboarding goes straight to staking selection.

## 10. Feature Flags

**File:** `frontend/hooks/useFeatureFlag.ts`

1. Add a feature flag entry for the new agent.
2. Keep behavior consistent with onboarding, funding, and wallet flows.

## 11. Assets

**Agent icon:**
1. `frontend/public/agent-{agentType}-icon.png`
2. `electron/public/agent-{agentType}-icon.png`

**Onboarding images:**
1. `frontend/public/introduction/setup-agent-<name>-1.png`
2. `frontend/public/introduction/setup-agent-<name>-2.png`
3. `frontend/public/introduction/setup-agent-<name>-3.png`
4. `electron/public/introduction/setup-agent-<name>-1.png`
5. `electron/public/introduction/setup-agent-<name>-2.png`
6. `electron/public/introduction/setup-agent-<name>-3.png`

**Chain and token icons:**
1. `frontend/public/chains/<chain>-chain.png`
2. `electron/public/chains/<chain>-chain.png`
3. `frontend/public/tokens/<token>-icon.png`
4. `electron/public/tokens/<token>-icon.png`

## 12. URLs and Subgraphs

**File:** `frontend/constants/urls.ts`

Update mappings for:

1. `REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN` if the agent uses rewards history.
2. `EXPLORER_URL_BY_MIDDLEWARE_CHAIN` and `BLOCKSCOUT_URL_BY_MIDDLEWARE_CHAIN` for UI links.

## 13. Electron and Runtime Environment

**Files:**
1. `.env.example`
2. `frontend/next.config.mjs`
3. `electron/utils/env-validation.js`
4. `.github/workflows/*` if CI passes RPCs at build time

Ensure new RPC variables exist end-to-end.

## 14. Achievements (Optional)

If the agent reports achievements:

1. Add new types in `frontend/constants/achievement.ts`.
2. Add types in `frontend/types/Achievement.ts`.
3. Add UI in `frontend/components/AchievementModal`.

## 15. Validation Script

Run this before release:

```bash
node scripts/js/check_service_templates.ts
```

This checks that:

1. `service_version` matches `agent_release.repository.version`.
2. GitHub release binaries exist.
3. The IPFS `service.yaml` can be fetched for the template hash.

## Testing Checklist

Basic integration:

1. Agent shows in selection and sidebar.
2. Agent icon renders in all places that use `/agent-{agentType}-icon.png`.
3. `servicePublicId` and `home_chain` match middleware so the agent filters correctly.

Funding:

1. Minimum funding and staking requirements show correct values.
2. Native token requirement accounts for safe creation threshold.
3. Additional token requirements display with correct icons.

Service template:

1. Hash and version are correct.
2. `KPI_DESC_PREFIX` appears in descriptions.
3. Env variables are correct and user inputs override as expected.

Staking:

1. Staking program entries show correct names and OLAS requirements.
2. Staking contract details and rewards load without errors.

Onboarding:

1. Onboarding steps render in order and images load.
2. Setup forms work when `requiresSetup` is true and `isX402Enabled` is false.
3. Geo restrictions render correctly when enabled.

Electron:

1. Store persists agent settings.
2. New RPC env var is validated.

## Common Pitfalls

1. `AgentMap` value mismatches middleware identifiers or asset filenames.
2. Missing chain entries in `frontend/constants/urls.ts` causing rewards history failures.
3. Forgetting to update `frontend/utils/middlewareHelpers.ts` for new chains.
4. Service template `name` not unique across all services.
5. Token decimals wrong for USDC-like tokens.
6. `requiresSetup` set to true while `isX402Enabled` is true, which skips setup flow.
7. Missing Electron store schema entries, leading to runtime errors.
