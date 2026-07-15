# Connect Agent — Frontend Implementation Plan

Branch: `feat/connect-agent`. Produced via `/explore-frontend-codebase`. No code here — a handoff plan.

## 1. Context
- **Need:** add a new Pearl agent "connect" — its brain is a local Claude Code session; a local signer binary handles signing. One instance **per chain** (Polygon, Base, Gnosis), all instances grouped under one **Connect** sidebar group. No staking. User picks the chain at setup. Only transfer + bridge funding.
- **DoD (iterations 1–2):** Connect appears in the agent list (grouped across chains); setup = pick chain (of 3, one-per-chain) → see that chain's funding requirements → click **"Select agent"** → service created with `staking_program_id:"no_staking"` + `use_staking:false`, no staking-select screen → 3-step intro (placeholder copy/images) → fund via transfer/bridge. **DoD (iteration 3):** running Connect shows an agent-info section + agent-wallet section only (no performance, no staking); on run the FE calls the local agent server's session endpoint and surfaces any error with a retry.

## 2. Scope Classification
- **Type:** Feature. **Scale:** Systemic (agent identity, setup router, service creation, main page).
- **Backend:** Depends on middleware/agent readiness — see §5.

## 3. Data-Flow Trace
- **Source:** user selects Connect in `AgentOnboarding`. The chain **selector lives on the Select Agent page itself** — inside the funding-requirements step of the right panel, **not a separate screen** — → picks chain → clicks **Select agent**.
- **Intermediate:** `AgentOnboarding` holds the selected chain in local state and passes it to `FundingRequirementStep` → `useInitialFundingRequirements(agentType, selectedChain)` → connect-gated `ServicesService.createService` (`staking_program_id:"no_staking"`, `use_staking:false`, `home_chain=selectedChain`) → `ServicesProvider` (new instance keyed by `serviceConfigId`, chain = `service.home_chain`).
- **Sink:** service created (middleware); sidebar renders the instance under the single "Connect" group (`AgentTreeMenu`); funding screen (`FundYourAgent`, transfer+bridge) funds the safe. When run: `POST /session` (local agent server) → session opens or error surfaced with retry.

## 4. File-Level Change List

| File | Change | What & Why |
|---|---|---|
| `frontend/constants/agent.ts` | modify | Add `Connect: 'connect'` to `AgentMap`. |
| `frontend/constants/x402.ts` | modify | Add `[AgentMap.Connect]` to `X402_ENABLED_FLAGS`. |
| `frontend/service/agents/Connect.ts` | new | `ConnectService extends StakedAgentService` — abstract staking methods stubbed (guarded by `no_staking`, never invoked). |
| `frontend/types/Agent.ts` | modify | Add `ConnectService` to `serviceApi` union; add `supportedChains` to `AgentConfig` (multi-chain — see §7). |
| `frontend/constants/serviceTemplates/service/connect.ts` | new | `CONNECT_SERVICE_TEMPLATE`: non-AEA release (`is_aea:false`), `configurations` block **per chain** (Polygon/Base/Gnosis) with `fund_requirements`, `staking_program_id:'no_staking'`. Same `service_public_id`/name across chains. |
| `frontend/constants/serviceTemplates/serviceTemplates.ts` | modify | Import + append `CONNECT_SERVICE_TEMPLATE` to `SERVICE_TEMPLATES`. |
| `frontend/config/agents.ts` | modify | `AGENT_CONFIG[Connect]`: `defaultStakingProgramId:'no_staking'`, `serviceApi:ConnectService`, `requiresSetup:false`, `hasExternalFunds:false`, `doesChatUiRequireApiKey:false`, `supportedChains:[Polygon,Base,Gnosis]`, `additionalRequirements` (USDC 5 on Polygon+Base). |
| `frontend/hooks/useFeatureFlag.ts` | modify | `FEATURES_CONFIG[Connect]`: `'on-ramp':false`, `'bridge-onboarding':true`, `'withdraw-funds':true`, `'backup-via-safe':true`. |
| `frontend/components/AgentIntroduction/constants.ts` | modify | `CONNECT_ONBOARDING_STEPS` — 3 steps, placeholder title/desc/imgSrc. |
| `frontend/components/AgentIntroduction/AgentIntroduction.tsx` | modify | Map `[AgentMap.Connect]` → `CONNECT_ONBOARDING_STEPS`. |
| `frontend/public/introduction/`, `frontend/public/` | new assets | Placeholder `setup-agent-connect-{1,2,3}.png`, `agent-connect-icon.png`. |
| `frontend/types/ElectronApi.ts` | modify | Add `[AgentMap.Connect]?: AgentSettings` to `PearlStore` (`isInitialFunded` as per-service `Record<string,boolean>` — multi-instance). |
| `frontend/context/pearlStoreKeys.ts` | modify | Add `'connect'` to `BACKEND_BOUND_KEYS`. |
| `frontend/components/SetupPage/AgentOnboarding/FundingRequirementStep.tsx` | modify | For Connect, render the chain **selector on the Select Agent page** — inside the funding-requirements step: antd `Select` (3 ordered options, disable occupied chains) + funding-requirements display for the selected chain. **No separate screen.** |
| `frontend/components/SetupPage/AgentOnboarding/AgentOnboarding.tsx` | modify | Hold the selected chain in local state; pass it (and the setter) to `FundingRequirementStep`; render the **"Select agent"** button (creates the service on click). No routing to a separate chain screen. |
| `frontend/hooks/useInitialFundingRequirements.ts` | modify | Use the user-selected chain for Connect instead of static `agentConfig.evmHomeChainId`. |
| `frontend/utils/service.ts` | modify | Relax the shared agent matcher (`isServiceOfAgent` → `matchesAgentConfig`): match `servicePublicId` (+`agentIds`) with `home_chain ∈ config.supportedChains` (not equality). Core multi-chain change (§7). |
| `frontend/service/Services.ts` | modify | In `createService`, when `staking_program_id==='no_staking'` also send `use_staking:false` — gated so other agents are unaffected. |
| `frontend/hooks/useStartService.ts` | modify | Guard the `STAKING_PROGRAMS[chainId][stakingProgramId]` lookup (`~:63-67`) for `no_staking` (currently **throws**); default `mechType`/`useMechMarketplace`. |
| `frontend/hooks/useCompleteAgentSetup.ts` | modify | `~:96` returns `'invalid_contract'` for `no_staking` — add Connect/`no_staking` branch so setup completes. |
| one-per-chain guard util | new | Block a 2nd Connect instance on an occupied chain, using `ServicesProvider.getServiceConfigIdsOf(chainId)`. |
| main-page section(s) *(iteration 3)* | modify | Render only agent-info + agent-wallet sections for Connect; omit performance + staking. Exact components TBD by a short main-page exploration at the start of PR 4. |
| `/session` integration *(iteration 3)* | new | On run: call the local agent server's `POST /session`; render `{launched,harness,error?}` — on failure show the error + Retry. |

## 5. Backend / Middleware Requirements *(external — must land before Phase 2 create can be exercised end-to-end)*
1. **New Connect agent minted + service package published** (IPFS `hash` + release) so `CONNECT_SERVICE_TEMPLATE` can be filled and `scripts/js/check_service_templates.ts` passes.
2. **Middleware readiness** — the `connect` agent type is added/served, and the create endpoint accepts `staking_program_id:"no_staking"` + `use_staking:false` (confirmed accepted).

FE sends `staking_program_id:"no_staking"` and `use_staking:false` in the create body.

## 6. Electron IPC / Store Changes
- Backend-bound only: `[AgentMap.Connect]?: AgentSettings` in `PearlStore` (`types/ElectronApi.ts`) + `'connect'` in `BACKEND_BOUND_KEYS` (`pearlStoreKeys.ts`). No `electron/store.js` change. Writes via `useElectronApi().store.set`.

## 7. Implementation Approach (recommended)
**Multi-chain identity via a relaxed matcher + `supportedChains`.** Connect is ONE agent type across 3 chains. Grouping matches `servicePublicId` (+`agentIds`) and today also requires `home_chain === middlewareHomeChainId` — that chain equality is the sole reason one config can't own instances on multiple chains. Give `AGENT_CONFIG[Connect]` a `supportedChains` list and relax the shared matcher to `home_chain ∈ supportedChains`; all Connect instances then resolve to the one type and render under a single "Connect" group (the grouped sidebar already handles N instances). All Connect instances share the same `servicePublicId`, so only the chain half is relaxed. A different on-chain name would **not** avoid this (the blocker is the chain equality, not the name). Ripple is small: the shared matcher is the one real change; only instance-name generation and the funding-requirement lookup switch from `config.evmHomeChainId` to per-instance `service.home_chain` (they already hold the service).

**One-per-chain:** no such limit exists today (`isAddingNewBlocked` is a global on/off). Build a guard on `ServicesProvider.getServiceConfigIdsOf(chainId)` — disable an occupied chain in the **chain dropdown on the Select Agent page** and block creation for it.

**Chain selection lives on the Select Agent page (NOT a separate screen).** When Connect is selected in `AgentOnboarding`, its right-panel funding-requirements step (`FundingRequirementStep`) swaps the static "Operating chain" display for an antd `Select` (chain dropdown) and shows the funding requirements for the chosen chain. `AgentOnboarding` owns the selected-chain state and passes it in. There is no `SelectChain` route/screen.

**Service-creation timing (Requirement 5):** create the service on the **"Select agent"** button click on the Select Agent page (the point the user commits the chosen chain), via a **connect-gated** path — do NOT mutate the shared `onDummyServiceCreation` for all agents. Build a single-chain template at create time: clone `CONNECT_SERVICE_TEMPLATE` with `home_chain = selectedMiddlewareChain`, `configurations` pruned to the selected chain, `staking_program_id:'no_staking'`, `use_staking:false`. Then route to the intro flow → funding, **bypassing `SelectStaking` entirely**. This removes Connect from both existing create sites (the setup-form create and the staking-select create).

**Setup flow for Connect:**
`Welcome → SetupPassword → SetupBackupSigner → AgentOnboarding (pick Connect → pick chain + view funding reqs on the same page → "Select agent" creates service) → AgentIntroduction (3 placeholder steps) → FundYourAgent (transfer+bridge) → Main`.

## 8. Per-Screen Visual Spec — chain selector on the Select Agent page (NOT a separate screen)

The chain selector is **part of the existing Select Agent page** — it renders in
the Connect branch of `FundingRequirementStep` (the right-panel funding-requirements
step of `AgentOnboarding`). There is no `SelectChain` screen / route.

```
Location: AgentOnboarding right panel → FundingRequirementStep (Connect branch)

Chain select (replaces the static "Operating chain" display for Connect):
  antd Select (no @/components/ui wrapper exists), size="large"
  placeholder="Select a chain"   (empty on first render — no default)
  Options IN ORDER: Polygon, Base, Gnosis
    Select.Option: <Flex align=center gap=8><Image src=/chains/<name>-chain.png w=20 h=20/>{name}</Flex>
    disabled=true when a Connect service already has home_chain===thatChain
      (source: useServices().services filtered by matchesAgentConfig(Connect))
    disabled option tag: "Already added"

Funding requirements (shown only after a chain is chosen):
  reuse the MinimumFundingRequirements block already in FundingRequirementStep
  data: useInitialFundingRequirements(agentType, selectedChain)
  Template fund_requirements per chain (raw — do NOT add safe-creation/deployment gas):
    Polygon: POL 15, USDC 5
    Base:    ETH 0.0005, USDC 5
    Gnosis:  XDAI 5

"Select agent" button (the page's existing renderAgentSelection slot):
  type=primary, size=large, block=yes, text="Select agent"
  Phase 1: rendered but DISABLED (no creation yet)
  Phase 2: onClick → create service (no_staking + use_staking:false, home_chain=selected) → AgentIntroduction

Right-panel layout: fixed-height card (no jump when switching agents); content on
top; slide-nav + "Select agent" button pinned to the bottom.
Colors: COLOR.* only.
```
Intro flow: `AgentIntroduction` with `CONNECT_ONBOARDING_STEPS` = 3 placeholder steps (`setup-agent-connect-{1,2,3}`).

## 9. Phased Execution Order (each phase = one PR)
```
PR 1 — Registration + multi-chain grouping + chain selector (creation DISABLED)  [#2067]
  Registration: AgentMap, x402, ConnectService stub, CONNECT_SERVICE_TEMPLATE,
    AGENT_CONFIG, FEATURES_CONFIG, onboarding constants(placeholders)+map+assets, store keys.
  Multi-chain grouping: matchesAgentConfig + supportedChains; per-instance home_chain
    in name-gen/funding; Connect groups across chains in the sidebar.
  Chain selector INLINE in the funding-requirements step of AgentOnboarding
    (FundingRequirementStep — NOT a separate screen), ordered + one-per-chain disabled;
    "Select agent" rendered DISABLED.

PR 2 — Enable creation + skip staking + funding + matcher-sweep fixes  [#2068]
  "Select agent" → connect-gated create (single-chain template clone,
    staking_program_id:"no_staking" + use_staking:false), bypass SelectStaking.
  no_staking fixes: useCompleteAgentSetup, Services.createService use_staking gating.
  Funding: transfer+bridge only (flags). 3-step intro (placeholders).
  Bug fixes: swept 9 inline strict matchers → matchesAgentConfig (non-Gnosis Connect
    resolution) incl. useStakingRewardsOf (also skips no_staking); "You own 1" pill;
    hide "Select agent" when all chains occupied; back-button → AgentOnboarding for
    no_staking. Review fixes: total matcher, env vars, agentIds/agent_id=161.

PR 3 — Beta tag + AutoRun exclusion   (NEW; independent of PR 4)
  Beta tag: add `isBeta?: boolean` to AgentConfig; set on AGENT_CONFIG[Connect]; render a
    "Beta" tag next to Connect in SelectAgent (by the status-icon spot) AND in the sidebar
    group header (Sidebar/AgentTreeMenu).
  Exclude Connect from AutoRun: filter it out of the eligibility pipeline in
    AutoRunProvider (getEligibleInstances / configuredInstances) — via a config flag
    (`excludeFromAutoRun?`) or agentType===Connect; exact spot via /pre-implementation-check.
  Tests: Beta tag renders (list + sidebar); AutoRun excludes Connect.

PR 4 — Running agent   (was PR 3; independent of PR 3)
  Start begins with a short main-page exploration (locate the agent-info + agent-wallet
    section components; identify performance/staking sections to omit for Connect).
  Main page for Connect: agent-info section + agent-wallet section ONLY — no performance,
    no staking. no_staking start-path fix: useStartService staking lookup.
  On run: call local agent server POST /session; render {launched,harness,error?};
    on launched:false / 503 / 4xx show the error + a Retry button (re-invokes /session).
```
Each PR: `yarn quality-check` + `yarn test` green; tests with components; never proceed with known issues.

## 10. Hard Constraints Checklist
- [ ] No `eslint-disable`. No new top-level provider (reuse `SetupProvider` for selected chain).
- [ ] Store writes via `useElectronApi().store.set` only.
- [ ] Constants in `constants.ts` — fund amounts in template/config, no inline numbers.
- [ ] New template → hash + `service_version` + run `scripts/js/check_service_templates.ts`.
- [ ] `isAgentEnabled:true`; register store namespace + `PearlStore` type.
- [ ] UI via `@/components/ui` where wrappers exist (no `Select`/`Button` wrapper — antd direct).
- [ ] `COLOR.*` only. `/pre-implementation-check` before coding; `/review-implementation` per PR.

## 11. Test Strategy
- **Provider:** `ServicesProvider` — Connect instance resolves to Connect type across all 3 chains (`matchesAgentConfig`); `getServiceConfigIdsOf` one-per-chain. Stub `ServicesService`.
- **Hook:** `useInitialFundingRequirements(chain)` per-chain values; `useFeatureFlag(Connect)` → transfer+bridge only. Mock provider context.
- **Component:** the Connect chain selector in `FundingRequirementStep` (on the Select Agent page) — empty default, ordered options, disables occupied chains, funding shown for the selected chain, "Select agent" gated; PR2: create called with `no_staking`+`use_staking:false`. `/session` integration: launched / error+retry states.
- Reuse `makeService`/`makeAgentService`/`makeMiddlewareService`; add `makeConnectService(chain)` factory. Cover loading/error/happy/one-per-chain-race.

## 12. Open Questions
None. The funding amounts (POL 15 / USDC 5 / ETH 0.0005 / USDC 5 / XDAI 5) go into `CONNECT_SERVICE_TEMPLATE` `fund_requirements` as-is — no safe-creation/deployment-gas added.

Deferrals (not questions): external §5 deps (mint + middleware readiness) gate PR2's end-to-end create; PR4 (running agent) opens with a short main-page exploration to locate the agent-info/wallet section components.
