# Services

## Overview

The services system manages the full lifecycle of autonomous agents — creation, deployment, monitoring, and teardown. A "service" represents a deployed agent configuration on a specific chain, backed by an on-chain NFT token, a Safe multisig, and an agent EOA address.

The system has three layers:

1. **Service API client** — HTTP requests to the Python middleware backend for CRUD, deployment, and withdrawal operations
2. **ServicesProvider** — central React context that polls service state, manages agent type selection, derives wallet addresses, and provides status overrides for UI consistency
3. **Consumer hooks** — focused accessors for single-service details, running agent detection, deployment activity, initial funding state, and geo-restrictions

```
ServicesService (middleware API)
  └── ServicesProvider (state + polling + selection)
        ├── useService (single service details + wallets)
        ├── useAgentRunning (cross-service active deployment check)
        ├── useAgentActivity (selected service deployment status)
        ├── useIsInitiallyFunded (per-agent persistent flag)
        └── useIsAgentGeoRestricted (geo eligibility API)
```

## Source of truth

- `frontend/service/Services.ts` — middleware API client (CRUD, deploy, stop, withdraw, performance)
- `frontend/context/ServicesProvider.tsx` — services state, polling, agent type selection, status overrides
- `frontend/hooks/useServices.ts` — context accessor (pass-through)
- `frontend/hooks/useService.ts` — single-service details, wallet extraction, status booleans
- `frontend/hooks/useAgentRunning.ts` — detects if another agent has an active deployment
- `frontend/hooks/useAgentActivity.ts` — selected service deployment status flags
- `frontend/hooks/useIsInitiallyFunded.ts` — per-agent initial funding flag (Electron store)
- `frontend/hooks/useIsAgentGeoRestricted.ts` — geo eligibility check (Pearl API)

## Contract / schema

### Middleware API endpoints

| Method | Endpoint | Frontend caller |
|--------|----------|-----------------|
| `GET` | `/api/v2/services` | `getServices()` |
| `GET` | `/api/v2/services/validate` | `getServicesValidationStatus()` |
| `GET` | `/api/v2/services/deployment` | `getAllServiceDeployments()` |
| `GET` | `/api/v2/service/{id}` | `getService(id)` |
| `GET` | `/api/v2/service/{id}/deployment` | `getDeployment(id)` |
| `GET` | `/api/v2/service/{id}/agent_performance` | `getAgentPerformance(id)` |
| `POST` | `/api/v2/service` | `createService()` |
| `PATCH` | `/api/v2/service/{id}` | `updateService()` |
| `POST` | `/api/v2/service/{id}` | `startService()` |
| `POST` | `/api/v2/service/{id}/deployment/stop` | `stopDeployment()` |
| `POST` | `/api/v2/service/{id}/terminate_and_withdraw` | `withdrawBalance()` |

### Service object (middleware response)

The frontend types this as `MiddlewareServiceResponse`. Example from a real Polystrat service:

```json
{
  "name": "Trader Agent Polymarket",
  "version": 9,
  "service_config_id": "sc-5abd7ccb-25c7-4388-a4c1-349b42503e1f",
  "service_public_id": "valory/polymarket_trader:0.1.0",
  "package_path": "polymarket_trader",
  "hash": "bafybeibstivjv4um66op3hwpjlir3imed2xfwkj6ya6g6xkdiyanm743ki",
  "hash_history": {
    "1773054164": "bafybeibstivjv4um66op3hwpjlir3imed2xfwkj6ya6g6xkdiyanm743ki"
  },
  "agent_release": {
    "is_aea": true,
    "repository": { "owner": "valory-xyz", "name": "trader", "version": "v0.31.7-rc2" }
  },
  "agent_addresses": ["0xe2B4B0410f44aE3578E7A8Aa0C069eBfCC68E0A6"],
  "home_chain": "polygon",
  "chain_configs": {
    "polygon": {
      "ledger_config": {
        "rpc": "https://virtual.polygon.eu.rpc.tenderly.co/...",
        "chain": "polygon"
      },
      "chain_data": {
        "instances": ["0xe2B4B0410f44aE3578E7A8Aa0C069eBfCC68E0A6"],
        "token": 34,
        "multisig": "0xb0e25A231AD79076aA844F7c1987e1518F1628Bb",
        "user_params": {
          "staking_program_id": "polygon_beta_1",
          "nft": "bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq",
          "agent_id": 14,
          "cost_of_bond": "50000000000000000000",
          "fund_requirements": {
            "0x0000000000000000000000000000000000000000": {
              "agent": "30000000000000000000",
              "safe": "40000000000000000000"
            },
            "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174": {
              "agent": "0",
              "safe": "65000000"
            }
          }
        }
      }
    }
  },
  "description": "[Pearl service] Trader agent for polymarket prediction markets on Polygon",
  "env_variables": {
    "SAFE_CONTRACT_ADDRESSES": {
      "name": "Safe contract addresses",
      "value": "{\"polygon\":\"0xb0e25A231AD79076aA844F7c1987e1518F1628Bb\"}",
      "provision_type": "computed"
    },
    "GENAI_API_KEY": {
      "name": "Gemini API Key",
      "description": "Gemini api key to allow the agent to use Gemini",
      "value": "",
      "provision_type": "user"
    }
  }
}
```

`env_variables` has three `provision_type` values: `"fixed"` (hardcoded), `"computed"` (derived at creation), `"user"` (user-provided). Most env vars are trimmed above for brevity.

### Deployment response

`GET /api/v2/services/deployment` returns a map keyed by `service_config_id`. `GET /api/v2/service/{id}/deployment` returns a single entry.

Stopped service (no healthcheck data):
```json
{
  "sc-de52fdd1-e339-47df-8128-41c6de948f5a": {
    "status": 1,
    "nodes": { "agent": [], "tendermint": [] },
    "healthcheck": {}
  }
}
```

Running service (with healthcheck):
```json
{
  "sc-efca1fe3-a749-42b4-9b00-41f7ff0c058c": {
    "status": 3,
    "nodes": { "agent": [], "tendermint": [] },
    "healthcheck": {
      "seconds_since_last_transition": 119.28,
      "is_tm_healthy": true,
      "is_healthy": true,
      "period": 11,
      "reset_pause_duration": 300,
      "is_transitioning_fast": true,
      "rounds": [
        "check_staking_k_p_i_met_round",
        "get_positions_round",
        "a_p_r_population_round",
        "evaluate_strategy_round",
        "reset_and_pause_round",
        "fetch_strategies_round",
        "call_checkpoint_round"
      ],
      "rounds_info": {
        "evaluate_strategy_round": {
          "name": "Evaluating strategies",
          "description": "The agent reviews its available strategies and chooses the best next move.",
          "transitions": {
            "done": "decision_making_round",
            "wait": "reset_and_pause_round",
            "withdrawal_initiated": "withdraw_funds_round"
          }
        }
      }
    }
  }
}
```

`rounds` is the recent round history (repeats across cycles). `rounds_info` maps round IDs to human-readable names, descriptions, and state transitions — trimmed above for brevity.

Middleware status codes: 1 (not deployed), 3 (deployed/running), 5 (stopped).

### Frontend deployment status enum

The frontend defines a richer set of statuses than the middleware docs expose:

```typescript
const MiddlewareDeploymentStatusMap = {
  CREATED: 0,
  BUILT: 1,
  DEPLOYING: 2,
  DEPLOYED: 3,
  STOPPING: 4,
  STOPPED: 5,
  DELETED: 6,
} as const;

// Predicates
isActiveDeploymentStatus(status)       // DEPLOYED | DEPLOYING | STOPPING
isTransitioningDeploymentStatus(status) // DEPLOYING | STOPPING
```

### Wallet types extracted from services

```typescript
type AgentEoa = { address: Address; type: 'eoa'; owner: 'agent' };
type AgentSafe = { address: Address; type: 'multisig'; owner: 'agent'; evmChainId: EvmChainId };
type AgentWallet = AgentEoa | AgentSafe;
```

### ServicesProvider context shape

```typescript
type ServicesContextType = {
  services?: MiddlewareServiceResponse[];
  serviceWallets?: AgentWallet[];
  availableServiceConfigIds: Array<{ configId: string; chainId: EvmChainId; tokenId?: number }>;
  selectedService?: Service;              // Service with deploymentStatus override
  deploymentDetails?: ServiceDeployment;
  selectedAgentType: AgentType;
  selectedAgentConfig: AgentConfig;
  selectedAgentName: Nullable<string>;
  selectedAgentNameOrFallback: string;
  serviceStatusOverrides?: Record<string, Maybe<MiddlewareDeploymentStatus>>;
  isSelectedServiceDeploymentStatusLoading: boolean;

  getServiceConfigIdsOf(chainId: EvmChainId): string[];
  getAgentTypeFromService(serviceConfigId?: string): Nullable<AgentType>;
  getServiceConfigIdFromAgentType(agentType: AgentType): Nullable<string>;
  updateAgentType(agentType: AgentType): void;
  overrideSelectedServiceStatus(status?: MiddlewareDeploymentStatus): void;

  isLoading?: boolean;
  isFetched?: boolean;
  refetch?: () => void;
  paused: boolean;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
};
```

## Runtime behavior

### ServicesProvider polling

Three React Query polls run inside the provider:

| Query | Key | Interval | Enabled when |
|-------|-----|----------|--------------|
| Services list | `SERVICES_KEY` | 5s (dynamic) | online + not paused |
| Validation status | `SERVICES_VALIDATION_STATUS_KEY` | 15s (fixed) | online + not paused |
| Selected deployment | `SERVICE_DEPLOYMENT_STATUS_KEY(id)` | 5s if transitioning, 15s otherwise | online + selectedServiceConfigId exists |

Services list and selected deployment intervals are scaled by `useDynamicRefetchInterval` based on window visibility. The validation query uses a fixed interval.

### Service selection

1. `selectedAgentType` is persisted in Electron store as `lastSelectedAgentType`
2. `selectedAgentConfig` is looked up from `AGENT_CONFIG[selectedAgentType]`
3. `selectedServiceConfigId` is derived by finding the first service whose `service_public_id` and `home_chain` match the selected agent config
4. If no matching service exists, `selectedServiceConfigId` is null

### Status override system

During backend transitions (deploy/stop), the UI can temporarily override the displayed status via `overrideSelectedServiceStatus()`. This prevents flickering when the backend hasn't caught up. The override is stored in `serviceStatusOverrides` and merged into `selectedService.deploymentStatus`.

### Wallet extraction (useService)

For each `chain_config` entry in a service:
- `chain_data.instances` → `AgentEoa` wallets
- `chain_data.multisig` → `AgentSafe` wallet (with `evmChainId` from chain lookup)

Status classification in `useService`:
- `isServiceTransitioning` — DEPLOYING or STOPPING
- `isServiceRunning` — DEPLOYED, DEPLOYING, or STOPPING
- `isServiceActive` — exactly DEPLOYED
- `isServiceBuilding` — BUILT or CREATED

### Agent running detection (useAgentRunning)

Polls `getAllServiceDeployments()` and checks if any service OTHER than `selectedService` has an active deployment status. `isAnotherAgentRunning` considers both backend status and `serviceStatusOverrides`. `runningAgentType` is derived from backend deployments only (does not use overrides), matched via `ACTIVE_AGENTS` by `servicePublicId` + `middlewareHomeChainId`.

### Geo restrictions (useIsAgentGeoRestricted)

Only runs the query when `agentConfig.isGeoLocationRestricted === true`. Currently only `Polystrat` has this flag. Calls the Pearl API (`/api/geo/agent-eligibility`), caches for 1 hour, and returns `isAgentGeoRestricted: true` when the eligibility status is not `'allowed'`.

### Initial funding flag (useIsInitiallyFunded)

Reads `storeState[selectedAgentType].isInitialFunded` from Electron store. Once set via `setIsInitiallyFunded()`, it persists permanently for that agent type.

## Failure / guard behavior

- **Offline**: All polling queries are disabled when `isOnline` is false
- **Paused**: Services list and validation queries respect `paused` flag from `usePause`
- **Invalid services**: If validation returns `false` for any service, an Ant Design error message is shown once per page session (only on `PAGES.Main`)
- **Missing service**: If `selectedServiceConfigId` is null, deployment polling doesn't run and `selectedService` is undefined
- **AbortSignal**: Read-style `ServicesService` methods (`getService`, `getServices`, `getServicesValidationStatus`, `getAllServiceDeployments`, `getDeployment`) accept `AbortSignal` for cleanup on unmount. Mutation-style methods (`createService`, `updateService`, `startService`, `stopDeployment`, `withdrawBalance`, `getAgentPerformance`) do not
- **Geo API failure**: `isGeoError` is true, `isAgentGeoRestricted` defaults to false (permissive)

## Test-relevant notes

- `ServicesService` methods are pure HTTP calls to `/api/v2/service*` — mock `fetch` or the service module
- `ServicesProvider` has 3 concurrent React Query polls (2 with dynamic intervals, 1 fixed) — test with `renderHook` + wrapper, mock `ServicesService` and dependencies
- `useService` derives wallets from `chain_configs` — test wallet extraction with multi-chain services containing various combinations of instances/multisig
- `useAgentRunning` cross-references `serviceStatusOverrides` with backend status — test both override and non-override paths
- `useAgentActivity` only checks DEPLOYED and DEPLOYING (not STOPPING) — verify this distinction
- `useIsInitiallyFunded` depends on Electron store — mock `useElectronApi` and `useStore`
- `useIsAgentGeoRestricted` has a guard on `isGeoLocationRestricted` — test with both restricted and non-restricted agent configs
- Status classification has subtle differences: `isServiceRunning` includes STOPPING but `isServiceActive` does not
- `availableServiceConfigIds` filters out under-construction agents — verify this filter
