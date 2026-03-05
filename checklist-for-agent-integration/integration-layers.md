# Where Things Get Updated

Integrating an agent into Pearl involves three separate repositories. Each layer depends on the one before it — do not move to the next layer until the current one is complete.

```
┌─────────────────────────────┐
│   1. Your Agent Repository  │  ← Start here
└──────────────┬──────────────┘
               │ agent is built, packaged, published
               ▼
┌─────────────────────────────┐
│  2. olas-operate-middleware  │  ← Staking contract registration
└──────────────┬──────────────┘
               │ middleware PR merged, commit hash noted
               ▼
┌─────────────────────────────┐
│    3. olas-operate-app       │  ← Pearl frontend integration
└─────────────────────────────┘
```

---

## Layer 1 — Your Agent Repository

**Who:** Agent team
**Dependency:** Must be complete before any other layer can start

This is your agent's own codebase. All changes here are internal to your team.

| Area | What to update |
|------|----------------|
| Persistent storage | Read `STORE_PATH` env var; save state periodically; recover after `SIGKILL` |
| Keys | Read `ethereum_private_key.txt` and `SAFE_CONTRACT_ADDRESSES` env var |
| Logging | Write `log.txt` with the standard format |
| Healthcheck | Expose `GET http://127.0.0.1:8716/healthcheck` returning `is_healthy` |
| Agent UI | Expose `GET http://127.0.0.1:8716/` (optional, for embedded Pearl UI) |
| Environment variables | Declare all env vars in `service.yaml` with `CONNECTION_CONFIGS_CONFIG_` prefix |
| Withdrawal | Handle `WITHDRAWAL_MODE=true` (if agent manages external funds) |
| Performance reporting | Write `agent_performance.json` to `CONNECTION_CONFIGS_CONFIG_STORE_PATH` |
| Packaging | `packages/packages.json` with service IPFS hash |
| Binary workflow | GitHub Actions workflow that builds `agent_runner_{os}_{arch}` binaries on release |
| Open Autonomy extras | `autonomy push-all`, linters (Isort, Black, Mypy, Bandit), ASCII printable range |

---

## Layer 2 — olas-operate-middleware

**Repository:** [github.com/valory-xyz/olas-operate-middleware](https://github.com/valory-xyz/olas-operate-middleware)
**Who:** Agent team raises PR; Pearl middleware team reviews and merges
**Dependency:** Layer 1 must be complete (staking contract deployed, agent registered)

This registers your agent's staking contract so Pearl's backend knows how to interact with it.

| File | What to update |
|------|----------------|
| [`operate/ledger/profiles.py`](https://github.com/valory-xyz/olas-operate-middleware/blob/df4e440fccff4364321ffec6b97f6939792c14f6/operate/ledger/profiles.py#L62) | Add your staking contract — use the same name you will use in the Pearl frontend |
| [`operate/quickstart/run_service.py`](https://github.com/valory-xyz/olas-operate-middleware/blob/df4e440fccff4364321ffec6b97f6939792c14f6/operate/quickstart/run_service.py#L74) | *(Optional)* Add your agent here to make it available via quickstart |

**After merge:** Note the commit hash — it is used to pin the dependency in Layer 3.

---

## Layer 3 — olas-operate-app (Pearl Frontend)

**Repository:** [github.com/valory-xyz/olas-operate-app](https://github.com/valory-xyz/olas-operate-app)
**Who:** Agent team raises PR against `staging`; Pearl frontend team reviews and merges
**Dependency:** Layer 2 PR must be merged and commit hash noted

This is where the agent becomes visible and usable inside the Pearl desktop app.

### Python / Backend

| File | What to update |
|------|----------------|
| [`pyproject.toml`](https://github.com/valory-xyz/olas-operate-app/blob/main/pyproject.toml) | Pin `olas-operate-middleware` to the Layer 2 commit hash |

### Frontend — Constants & Config

| File | What to update |
|------|----------------|
| [`frontend/constants/agent.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/agent.ts) | Add agent key to `AgentMap` enum |
| [`frontend/constants/stakingProgram.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/stakingProgram.ts) | Add staking program ID constant(s) |
| [`frontend/constants/serviceTemplates/service/`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/serviceTemplates/) | Create new service template file for the agent |
| [`frontend/constants/serviceTemplates/serviceTemplates.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/serviceTemplates/serviceTemplates.ts) | Import and add the new template to `SERVICE_TEMPLATES` |

### Frontend — Staking & Activity Checkers

| File | What to update |
|------|----------------|
| [`frontend/config/activityCheckers.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/activityCheckers.ts) | Add activity checker contract(s) to the correct chain map |
| [`frontend/config/stakingPrograms/{chain}.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/stakingPrograms/) | Add staking program config(s) with address, OLAS requirement, and supported agents |

### Frontend — Agent Definition

| File | What to update |
|------|----------------|
| [`frontend/service/agents/{AgentName}.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/service/agents/) | Create agent service class extending `StakedAgentService` |
| [`frontend/config/agents.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/agents.ts) | Add full agent config entry |
| [`frontend/hooks/useFeatureFlag.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/hooks/useFeatureFlag.ts) | Add feature flag decisions for the agent |

### Frontend — UI & Onboarding

| File | What to update |
|------|----------------|
| [`frontend/components/AgentIntroduction/constants.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/components/AgentIntroduction/constants.ts) | Add onboarding steps (title, description, image per step) |
| `AgentIntroduction.tsx` | Map the new agent type to its onboarding steps |
| `frontend/components/SetupPage/SetupYourAgent/` | *(Only if `requiresSetup = true`)* Create setup form and validation hook |

### Frontend — Assets

| Location | What to add |
|----------|-------------|
| `frontend/public/agent-{agentType}-icon.png` | Agent icon (64×64 px PNG) |
| `frontend/public/introduction/setup-agent-{agentType}-{n}.png` | One onboarding image per step |

### New Chain Only

If the agent runs on a chain not yet in Pearl, these additional files also need updating in Layer 3:

| File | What to update |
|------|----------------|
| [`frontend/constants/chains.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/constants/chains.ts) | Add to `EvmChainIdMap`, `MiddlewareChainMap`, `CHAIN_IMAGE_MAP` |
| [`frontend/config/chains.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/chains.ts) | Add RPC env var and safe creation threshold |
| [`frontend/config/tokens.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/tokens.ts) | Add token config for the new chain |
| [`frontend/config/olasContracts.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/olasContracts.ts) | Add `ServiceRegistryL2` and `ServiceRegistryTokenUtility` addresses |
| [`frontend/config/stakingPrograms/index.ts`](https://github.com/valory-xyz/olas-operate-app/blob/main/frontend/config/stakingPrograms/index.ts) | Register the new chain's staking programs file |
| `frontend/public/chains/{chain}-chain.png` | Chain image asset |

> **Note:** New chain support also requires infrastructure changes (RPC endpoints, build scripts) that are handled by the Pearl team internally. Contact the PM before starting.

---

## Dependency Summary

| Layer | Blocked until… |
|-------|----------------|
| Layer 2 (middleware) | Staking contract deployed, agent registered on Olas Registry |
| Layer 3 (Pearl frontend) | Layer 2 PR merged and commit hash noted |
| Final verification | Layer 3 PR merged and deployed |
