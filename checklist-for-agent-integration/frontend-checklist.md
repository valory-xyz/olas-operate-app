# Frontend Integration Checklist

## 1. Introduction

This checklist covers everything required to integrate a new agent into the Pearl frontend. It has two audiences:

- **Agent Team**: Section 2 lists the information and assets you must provide before frontend work can begin.
- **Pearl Frontend Team**: Sections 3 and 4 list all the code changes required in the `olas-operate-app` repository.

Work through the sections in order. Sections 3 and 4 cannot start until Section 2 is complete.

---

## 2. Information Required from the Agent Team

Fill in every bracketed field and check every box before passing this to the Pearl frontend team.

### 2.1 Identity & Branding

- [ ] **Display name** (shown in the UI, e.g. "Omenstrat"): [fill in]
- [ ] **Short description** (one sentence, shown on the agent selection card, e.g. "Participates in prediction markets on Omen."): [fill in]
- [ ] **Category** (optional, one of: `Prediction Markets` | `DeFi` | leave blank): [fill in]
- [ ] **Default behavior string** (optional, shown in the Performance tab under "Agent Behavior", e.g. "Balanced strategy that spreads predictions, limits risk."): [fill in]
- [ ] **Service public ID** (the Olas Registry public identifier, e.g. `valory/trader`): [fill in]
- [ ] **Agent type key** (snake_case internal identifier used throughout the codebase, e.g. `polymarket_trader`): [fill in]

### 2.2 Visual Assets

Required assets must be provided as PNG files at the specified paths relative to `frontend/public/`.

- [ ] **Agent icon**: `agent-{agentType}-icon.png`
  - Dimensions: 64×64 px (match existing icons)
  - Path: `frontend/public/agent-{agentType}-icon.png`
- [ ] **Onboarding step images** (3 images, one per onboarding step):
  - `introduction/setup-agent-{agentType}-1.png`
  - `introduction/setup-agent-{agentType}-2.png`
  - `introduction/setup-agent-{agentType}-3.png`
  - Dimensions: match existing onboarding images (check `frontend/public/introduction/`)
- [ ] **Onboarding step copy** (for each of the 3 steps, provide a title and a short description):
  - Step 1 — Title: [fill in] | Description: [fill in]
  - Step 2 — Title: [fill in] | Description: [fill in]
  - Step 3 — Title: [fill in] | Description: [fill in]
- [ ] **Chain image** (only if the agent is on a new chain — see Section 3): `chains/{chainName}-chain.png`

### 2.3 Chain & Network

- [ ] **Home chain EVM chain ID** (e.g. `137` for Polygon): [fill in]
- [ ] **Home chain name** (e.g. `Polygon`): [fill in]
- [ ] **Middleware chain name** (lowercase, as used in the middleware API, e.g. `polygon`): [fill in]
- [ ] **Is this a new chain?** (i.e. not currently in `frontend/constants/chains.ts`): Yes / No
  - If **Yes**, also provide:
    - [ ] RPC environment variable name (e.g. `POLYGON_RPC`): [fill in]
    - [ ] Chain image (see Section 2.2)

### 2.4 Staking Programs & On-Chain Contracts

Provide one row per staking tier (e.g. Beta I, Beta II, Beta III).

- [ ] **Staking programs table**:

  | Program name (human-readable) | Staking program ID key | Contract address | OLAS staking requirement |
  |-------------------------------|----------------------|-----------------|--------------------------|
  | [e.g. Polygon Beta I]         | [e.g. PolygonBeta1]  | [0x...]          | [e.g. 100 OLAS]          |

- [ ] **Default staking program ID key** (the program used when the agent is first set up): [fill in]
- [ ] **Activity checker contract address**: [0x...]
- [ ] **Activity checker ABI type** (one of: `Mech` | `Requester` | `Staking` | `Meme` | `Pet`): [fill in]
- [ ] **Mech type** (if applicable, e.g. `MarketplaceV2`; leave blank if not relevant): [fill in]
- [ ] **NFT IPFS hash** used in the staking contract `nft` field (e.g. `bafybei...`): [fill in]
- [ ] **Agent IDs** from the Olas Registry (one or more integers, e.g. `[86]`): [fill in]
- [ ] **ServiceRegistryL2 address** on this chain (only if new chain): [0x...]
- [ ] **ServiceRegistryTokenUtility address** on this chain (only if new chain): [0x...]

### 2.5 Service Template

The service template is the deployment manifest used by the middleware to start the agent.

- [ ] **IPFS hash** of the service package (e.g. `bafybeib...`): [fill in]
- [ ] **Service version** string (e.g. `v0.31.7`): [fill in]
- [ ] **Agent release repository** (GitHub org/repo, e.g. `valory-xyz/trader`): [fill in]
- [ ] **Agent release version tag** (e.g. `v0.31.7`): [fill in]
- [ ] **Environment variables** — for each variable, provide:

  | Variable name | Description | Provision type (`USER` / `COMPUTED` / `FIXED`) | Default value (FIXED only) |
  |---------------|-------------|------------------------------------------------|---------------------------|
  | [e.g. POLYGON_LEDGER_RPC] | Polygon RPC endpoint | COMPUTED | — |
  | [e.g. MY_API_KEY] | API key for X service | USER | — |

- [ ] **Fund requirements per chain** (amounts the agent/safe wallet need at startup):

  | Chain | Agent wallet (native token + amount) | Safe wallet (native token + amount) | Safe wallet (ERC20 token + amount) |
  |-------|--------------------------------------|-------------------------------------|-------------------------------------|
  | [e.g. Polygon] | [e.g. 30 POL] | [e.g. 40 POL] | [e.g. 65 USDC.e] |

- [ ] **Cost of bond** (amount in native token units, e.g. `20` for 20 ETH equivalent): [fill in]

### 2.6 ERC20 Token Requirements (if any)

If the agent requires ERC20 tokens on any chain, fill in the table below. Skip if only native tokens are needed.

- [ ] **ERC20 tokens required**:

  | Token symbol | Chain | Contract address | Decimals |
  |-------------|-------|-----------------|----------|
  | [e.g. USDC.e] | [e.g. Polygon] | [0x...] | [e.g. 6] |

### 2.7 Agent Behaviour Flags

Confirm each flag with the Pearl PM and agent team before implementation.

- [ ] **`requiresSetup`**: Does the agent need a setup wizard where the user enters API keys or configuration?
  - If **Yes**, list the required input fields:
    - Field 1 — Label: [fill in] | Placeholder: [fill in] | Validation: [fill in]
    - Field 2 — Label: [fill in] | Placeholder: [fill in] | Validation: [fill in]
    - (add more as needed)
  - Answer: Yes / No
- [ ] **`isGeoLocationRestricted`**: Should a geo-restriction warning be shown in certain countries? Yes / No
- [ ] **`hasExternalFunds`**: Does the agent hold funds in external DeFi protocols (not in the agent/safe wallet directly)? Yes / No
- [ ] **`isX402Enabled`**: Does the agent use the X402 payment protocol? Yes / No
- [ ] **`doesChatUiRequireApiKey`**: Does the agent's embedded chat UI require the user to provide an API key? Yes / No
- [ ] **`needsOpenProfileEachAgentRun`**: Does the user need to open an external URL each agent run (e.g. Pett.ai profile)? Yes / No
  - If **Yes**, provide alert title and message: [fill in]

### 2.8 Feature Flags

Agree on the on/off setting for each feature flag for this agent. Document the decisions here:

| Feature flag | Description | Enabled for this agent? |
|-------------|-------------|------------------------|
| `withdraw-funds` | Enables withdrawing funds from the wallet | Yes / No |
| `staking-contract-section` | Shows the staking contract section in the UI | Yes / No |
| `backup-via-safe` | Enables wallet backup via Safe (skip if chain not on Safe) | Yes / No |
| `bridge-onboarding` | Enables bridge-funds flow during initial setup | Yes / No |
| `bridge-add-funds` | Enables bridge-funds flow in low-balance alerts | Yes / No |
| `on-ramp` | Enables the fiat on-ramp (buy crypto) flow | Yes / No |

### 2.9 Performance Metrics

Agents must output an `agent_performance.json` file. See `agent-performance-checklist.md` for the full specification. Provide the metrics this agent will report:

- [ ] **Metrics list** (max 2 recommended: 1 primary, 1 secondary):

  | Metric name | `is_primary` | Description / tooltip text | Example value |
  |-------------|-------------|---------------------------|---------------|
  | [e.g. Total ROI] | true | [e.g. Total return including staking rewards] | [e.g. 12%] |
  | [e.g. Prediction accuracy] | false | [e.g. Percentage of correct predictions] | [e.g. 55.9%] |

- [ ] **`agent_behavior` example string** (optional, free-text description of agent's current strategy): [fill in]

---

## 3. New Chain Setup

**Skip this section entirely if the agent runs on a chain already supported in Pearl (Gnosis, Base, Mode, Optimism, Polygon).**

If the agent is on a new chain, complete every item below before starting Section 4.

### 3.1 Chain Constants

- [ ] Add the new chain to `EvmChainIdMap` in [frontend/constants/chains.ts](../frontend/constants/chains.ts):
  ```ts
  NewChain: <chainId>,
  ```
- [ ] Add the new middleware chain name to `MiddlewareChainMap` in [frontend/constants/chains.ts](../frontend/constants/chains.ts):
  ```ts
  NewChain: 'newchain',
  ```
- [ ] Add chain image mapping to `CHAIN_IMAGE_MAP` in [frontend/constants/chains.ts](../frontend/constants/chains.ts):
  ```ts
  [EvmChainIdMap.NewChain]: '/chains/newchain-chain.png',
  ```
- [ ] Add chain image asset: `frontend/public/chains/newchain-chain.png`

### 3.2 RPC & Provider Configuration

- [ ] Add the RPC env var entry and safe creation threshold in [frontend/config/chains.ts](../frontend/config/chains.ts):
  ```ts
  [EvmChainIdMap.NewChain]: {
    rpcUrl: process.env.NEWCHAIN_RPC ?? '',
    safeCreationThreshold: <threshold_in_native_token_wei>,
  },
  ```
- [ ] Add `NEWCHAIN_RPC` to `.env.example`
- [ ] Add `NEWCHAIN_RPC` to `build_pearl.sh` (and any other build scripts that inject env vars)

### 3.3 Token Configuration

- [ ] Add token config to [frontend/config/tokens.ts](../frontend/config/tokens.ts) for each token used on the new chain:
  ```ts
  export const NEWCHAIN_TOKEN_CONFIG: TokenConfig = {
    NATIVE_TOKEN: { symbol: 'ETH', decimals: 18, address: null },
    OLAS: { symbol: 'OLAS', decimals: 18, address: '0x...' },
    // add ERC20s as needed
  };
  ```

### 3.4 OLAS Contract Addresses

- [ ] Add `ServiceRegistryL2` and `ServiceRegistryTokenUtility` addresses for the new chain to [frontend/config/olasContracts.ts](../frontend/config/olasContracts.ts):
  ```ts
  [EvmChainIdMap.NewChain]: {
    ServiceRegistryL2: '0x...',
    ServiceRegistryTokenUtility: '0x...',
  },
  ```

### 3.5 Staking Programs File

- [ ] Create `frontend/config/stakingPrograms/newchain.ts` following the pattern in [frontend/config/stakingPrograms/polygon.ts](../frontend/config/stakingPrograms/polygon.ts)
- [ ] Export the new chain's staking program map and register it in [frontend/config/stakingPrograms/index.ts](../frontend/config/stakingPrograms/index.ts)

### 3.6 Activity Checkers

- [ ] Add a new chain activity checker map to [frontend/config/activityCheckers.ts](../frontend/config/activityCheckers.ts):
  ```ts
  export const NEWCHAIN_STAKING_PROGRAMS_ACTIVITY_CHECKERS: Record<string, MulticallContract> = {
    // entries added in Step 3 of Section 4
  };
  ```

---

## 4. Pearl Frontend Code Changes

Complete these steps in order. Each step references the file to edit and what to add.

### Step 1 — Register the Agent Type

- [ ] Add the agent type to the `AgentMap` enum in [frontend/constants/agent.ts](../frontend/constants/agent.ts):
  ```ts
  NewAgent: 'new_agent_key',
  ```
  The string value must match the internal name used by the middleware (same as the `name` field in the agent config).

### Step 2 — Add Staking Program IDs

- [ ] Add each staking program ID to [frontend/constants/stakingProgram.ts](../frontend/constants/stakingProgram.ts):
  ```ts
  NewAgentBeta1: 'NewAgentBeta1',
  NewAgentBeta2: 'NewAgentBeta2',
  ```
  The string values are used as keys throughout the staking program configs.

### Step 3 — Register Activity Checkers

- [ ] Add the activity checker contract(s) to the appropriate chain map in [frontend/config/activityCheckers.ts](../frontend/config/activityCheckers.ts):
  ```ts
  // Inside the correct chain map (e.g. POLYGON_STAKING_PROGRAMS_ACTIVITY_CHECKERS)
  [STAKING_PROGRAM_IDS.NewAgentBeta1]: getRequesterActivityCheckerContract('0x...'),
  ```
  Choose the helper function that matches the ABI type provided in Section 2.4:
  - `getMechActivityCheckerContract` — Mech ABI
  - `getRequesterActivityCheckerContract` — Requester ABI
  - `getStakingActivityCheckerContract` — Staking ABI
  - `getMemeActivityCheckerContract` — Meme ABI
  - `getPetActivityCheckerContract` — Pet ABI

### Step 4 — Add Staking Program Config

- [ ] Add each staking program entry to the correct chain file in [frontend/config/stakingPrograms/](../frontend/config/stakingPrograms/) (e.g. `polygon.ts`):
  ```ts
  [STAKING_PROGRAM_IDS.NewAgentBeta1]: {
    chainId: EvmChainIdMap.NewChain,
    name: 'New Agent Beta I',
    agentsSupported: [AgentMap.NewAgent],
    stakingRequirements: { OLAS: 100 },
    mechType: MechType.MarketplaceV2,  // or omit if not applicable
    mech: MECHS[EvmChainIdMap.NewChain][MechType.MarketplaceV2].contract,
    activityChecker: NEWCHAIN_STAKING_PROGRAMS_ACTIVITY_CHECKERS[STAKING_PROGRAM_IDS.NewAgentBeta1],
    address: '<contract_address>',
    contract: new MulticallContract('<contract_address>', STAKING_TOKEN_PROXY_ABI),
    id: deriveStakingProgramId('<contract_address>'),
  },
  ```

### Step 5 — Create the Service Template

- [ ] Create a new service template file at `frontend/constants/serviceTemplates/service/newagent.ts` following the pattern in [frontend/constants/serviceTemplates/service/trader.ts](../frontend/constants/serviceTemplates/service/trader.ts). Key fields:
  - `agentType`: matches the `AgentMap` key
  - `hash`: IPFS hash from Section 2.5
  - `service_version`: from Section 2.5
  - `agent_release.repository.version`: from Section 2.5
  - `home_chain`: middleware chain name from Section 2.3
  - `configurations[chain].fund_requirements`: from Section 2.5
  - `configurations[chain].nft`: NFT IPFS hash from Section 2.4
  - `env_variables`: all env vars from Section 2.5
- [ ] Import and append the new template to `SERVICE_TEMPLATES` in [frontend/constants/serviceTemplates/serviceTemplates.ts](../frontend/constants/serviceTemplates/serviceTemplates.ts)
- [ ] Run `scripts/js/check_service_templates.ts` to validate the template structure

### Step 6 — Create the Agent Service Class

- [ ] Create `frontend/service/agents/NewAgent.ts` extending `StakedAgentService`. Follow the pattern in [frontend/service/agents/Polystrat.ts](../frontend/service/agents/Polystrat.ts):
  - Implement `getAgentStakingRewardsInfo()` with the correct chain ID and default staking program
  - Implement `getAvailableRewardsForEpoch()`, `getServiceStakingDetails()`, `getStakingContractDetails()` using the correct chain's contract helpers

### Step 7 — Add Agent Config

- [ ] Add the agent config entry to [frontend/config/agents.ts](../frontend/config/agents.ts):
  ```ts
  [AgentMap.NewAgent]: {
    name: AgentMap.NewAgent,
    evmHomeChainId: EvmChainIdMap.NewChain,
    middlewareHomeChainId: MiddlewareChainMap.NewChain,
    agentIds: [<agentId>],
    defaultStakingProgramId: STAKING_PROGRAM_IDS.NewAgentBeta1,
    serviceApi: NewAgentService,
    displayName: '<DisplayName>',
    description: '<One sentence description>',
    isAgentEnabled: true,
    isUnderConstruction: false,   // set to true if launching as "coming soon"
    requiresSetup: <true/false>,
    isX402Enabled: <true/false>,
    doesChatUiRequireApiKey: <true/false>,
    hasExternalFunds: <true/false>,
    servicePublicId: '<valory/service-name>',
    erc20Tokens: [TokenSymbol.USDC],  // omit if not needed
    additionalRequirements: { ... }, // omit if not needed
    isGeoLocationRestricted: <true/false>,  // omit if false
    needsOpenProfileEachAgentRun: <true/false>,  // omit if false
    category: '<Category>',  // omit if not applicable
    defaultBehavior: '<Default behavior string>',  // omit if not applicable
  },
  ```

### Step 8 — Add Feature Flags

- [ ] Add an entry to `FEATURES_CONFIG` in [frontend/hooks/useFeatureFlag.ts](../frontend/hooks/useFeatureFlag.ts) using the decisions from Section 2.8:
  ```ts
  [AgentMap.NewAgent]: {
    'withdraw-funds': true,
    'staking-contract-section': true,
    'backup-via-safe': true,
    'bridge-onboarding': true,
    'bridge-add-funds': true,
    'on-ramp': true,
  },
  ```

### Step 9 — Add Onboarding Steps

- [ ] Add the `NEWAGENT_ONBOARDING_STEPS` constant to [frontend/components/AgentIntroduction/constants.ts](../frontend/components/AgentIntroduction/constants.ts):
  ```ts
  export const NEWAGENT_ONBOARDING_STEPS: OnboardingStep[] = [
    {
      title: '<Step 1 title>',
      desc: '<Step 1 description>',
      imgSrc: '/introduction/setup-agent-new_agent_key-1.png',
    },
    {
      title: '<Step 2 title>',
      desc: '<Step 2 description>',
      imgSrc: '/introduction/setup-agent-new_agent_key-2.png',
    },
    {
      title: '<Step 3 title>',
      desc: '<Step 3 description>',
      imgSrc: '/introduction/setup-agent-new_agent_key-3.png',
    },
  ];
  ```
- [ ] Map the new agent type to its steps in `AgentIntroduction.tsx` (inside the switch/map that builds the onboarding carousel)

### Step 10 — Setup Wizard (only if `requiresSetup = true`)

- [ ] Create `frontend/components/SetupPage/SetupYourAgent/NewAgentForm/NewAgentForm.tsx` — the form component shown during agent setup. Follow the pattern in `SetupYourAgent/PredictAgentForm/PredictAgentForm.tsx`
- [ ] Create `frontend/components/SetupPage/SetupYourAgent/NewAgentForm/useNewAgentFormValidate.ts` — validation hook for the form
- [ ] Register the new form component in `SetupYourAgent.tsx` so it is rendered when the new agent type is selected

### Step 11 — Add Visual Assets

- [ ] Copy the agent icon to `frontend/public/agent-{agentType}-icon.png`
- [ ] Copy the 3 onboarding step images to `frontend/public/introduction/setup-agent-{agentType}-{1,2,3}.png`
- [ ] (If new chain) Copy the chain image to `frontend/public/chains/{chainName}-chain.png`

---

## 5. Verification

After completing all frontend code changes, verify the integration end-to-end:

- [ ] `scripts/js/check_service_templates.ts` runs without errors
- [ ] `yarn quality-check:frontend` passes (lint + TypeScript typecheck)
- [ ] Agent appears in the agent selection list during setup flow
- [ ] Agent icon loads without 404
- [ ] Onboarding carousel displays 3 steps with correct images and text
- [ ] Geo-restriction dialog appears if `isGeoLocationRestricted = true`
- [ ] Setup wizard (if `requiresSetup = true`) appears and form validation works correctly
- [ ] Funding requirement step shows correct native token, ERC20, and OLAS amounts
- [ ] Agent starts successfully and the main dashboard loads
- [ ] Staking contract section shows the correct staking program(s)
- [ ] Feature flags behave as agreed (withdraw-funds, on-ramp, bridge, etc.)
- [ ] Performance tab displays metrics from `agent_performance.json`
- [ ] Onboarding images load without 404

---

## 6. Status Tracking

- [ ] Section 2 complete (all agent team information collected)
- [ ] Section 3 complete (new chain setup, if applicable)
- [ ] Section 4 complete (all Pearl frontend code changes merged)
- [ ] Section 5 complete (all verification checks pass)
- [ ] **Integration complete** — check this box when the agent is live in Pearl.

For questions, contact the Pearl frontend team or open an issue in [olas-operate-app](https://github.com/valory-xyz/olas-operate-app).
