# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pearl is a cross-platform Electron desktop application for running autonomous agents powered by the OLAS Network. The architecture consists of three main layers:

1. **Electron App** (CommonJS) - Desktop application wrapper at `/electron/`
2. **Next.js Frontend** (TypeScript) - React-based UI at `/frontend/`
3. **Python Backend** (Poetry) - Middleware and agent operations at `/operate/`

The frontend is embedded in Electron via Next.js, and communicates with the Python backend through IPC channels and local HTTP requests.

## Development Commands

**Prerequisites:**
- Node.js 20+ (see `.nvmrc`)
- Yarn 1.22.0+
- Python 3.14
- Poetry 2.3.2

### Installation

```bash
# Install all dependencies (frontend, backend, and electron)
yarn install-deps

# Or install separately:
yarn                    # Electron dependencies
yarn install:frontend   # Frontend dependencies
yarn install:backend    # Python backend (poetry install --no-root)
```

### Development

```bash
# Run Electron app with hot reload
yarn dev

# Run frontend dev server (Next.js on port 3000)
yarn dev:frontend

# Run Python backend/middleware separately
yarn dev:backend

# Run local Hardhat node for testing
yarn dev:hardhat
```

### Testing & Quality

```bash
# Frontend tests
yarn test:frontend

# Linting
yarn lint:frontend
yarn lint:frontend --fix

# Type checking
yarn typequality-check:frontend

# Combined quality check (lint + typecheck)
yarn quality-check:frontend
```

### Building

```bash
# Build frontend (outputs to electron/.next and electron/public)
yarn build:frontend

# Build full Pearl application
yarn build:pearl        # Uses build_pearl.sh

# Download required binaries
yarn download-binaries
```

## Frontend Coverage Workflow

When adding or reviewing frontend tests, use `frontend/tests/TEST_PLAN.md` as the source of truth for phase scope and read the matching feature doc in `docs/features/` before writing suites.

- Reuse `frontend/tests/helpers/factories.ts` first. If a default already exists there, do not repeat it in the test body; override only the field required for the case.
- If a suite needs a local helper, keep it as a thin wrapper over a shared factory rather than a second fixture system.
- Split coverage by ownership: providers cover query wiring, polling, refetch, and merge behavior; hooks cover derivation; components cover rendering and user interaction with mocked hooks/providers.
- If the same payload shape appears in two suites, promote it into `frontend/tests/helpers/factories.ts` before adding more inline literals.
- For Phase 4 staking/rewards work, start with the shared staking factories (`makeStakingContractDetails`, `makeServiceStakingDetails`, `makeRawStakingRewardsInfo`, `makeStakingRewardsInfo`, `makeRewardsHistoryEntry`, `makeRewardsHistoryServiceResponse`) and follow the staged execution order in `frontend/tests/TEST_PLAN.md` rather than attempting the entire phase in one pass.

## Architecture Details

### Communication Flow

The application uses a multi-layered communication architecture:

1. **Frontend → Electron**: IPC via `contextBridge` (see `electron/preload.js`)
   - Store operations: `electronAPI.store.{get,set,delete,clear}`
   - Window controls: `electronAPI.{closeApp,minimizeApp,setTrayIcon}`
   - Notifications: `electronAPI.showNotification`
   - Logging: `electronAPI.{saveLogs,logEvent}`

2. **Electron → Python Backend**: Spawned child process communication
   - Backend runs via `poetry run python -m operate.cli daemon`
   - HTTP API communication (likely via localhost)

3. **Frontend State Management**:
   - React Context providers in `/frontend/context/`
   - Key providers: `ServicesProvider`, `BalanceProvider`, `StakingContractDetailsProvider`
   - Electron store persistence via `electron-store` (`electron/store.js`)

### Service Templates & Agents

Service configurations are defined in `frontend/constants/serviceTemplates.ts`:
- Each service template has a `hash`, `name`, `description`, and versioning
- Multiple agent types: `PredictTrader`, `Modius`, `Optimus`, `AgentsFun`, `PettAi`
- Chain-specific configurations in `configurations` object (funding requirements, staking programs, NFTs)

**When modifying service templates:**
1. Update `hash` in `frontend/constants/serviceTemplates.ts`
2. Update corresponding `service_version` and `agent_release.repository.version`
3. Run `scripts/js/check_service_templates.ts` to validate
4. Ensure agent is enabled in `frontend/config/agents.ts` with `isAgentEnabled: true`

### Electron Store Schema

The application uses `electron-store` for persistent state (`electron/store.js`):
- Global settings: `environmentName`, `lastSelectedAgentType`, `knownVersion`
- Per-agent settings: `trader`, `memeooorr`, `modius`, `optimus`, `pett_ai`
- Each agent tracks: `isInitialFunded`, `isProfileWarningDisplayed`
- Store changes broadcast to renderer via `store-changed` IPC event

### Python Backend

- Entry point: `operate/pearl.py` (PyInstaller executable)
- Uses `olas-operate-middleware` (v0.14.5) as main dependency
- Built with PyInstaller for distribution (see `build_pearl.sh`)
- Includes Tendermint binary for consensus

### Build Process

Platform-specific builds:
- **macOS**: `build_pearl.sh` (ARM64 & x64)
- **Windows**: `Makefile` (see `make build`)
- PyInstaller creates standalone executables in `electron/bins/middleware/`
- Frontend built with environment-specific RPC endpoints

## Key File Locations

- Main Electron entry: `electron/main.js`
- Frontend entry: `frontend/pages/_app.tsx`
- Service definitions: `frontend/constants/serviceTemplates.ts`
- Agent configs: `frontend/config/agents.ts`
- Chain configs: `frontend/constants/chains.ts`
- Token configs: `frontend/config/tokens.ts`
- Staking programs: `frontend/constants/stakingProgram.ts`

## Commit Conventions

Follow conventional commit format:
- `feat(scope):` New features
- `fix(scope):` Bug fixes
- `chore(scope):` Maintenance tasks
- `docs(scope):` Documentation
- `refactor(scope):` Code refactoring
- `test(scope):` Testing changes

Examples:
```
feat(trader): add new prediction strategy
fix(balance): correct USDC balance calculation
chore: bump version to 1.1.9-rc2 [skip release]
```

## Testing Locally

To test with a custom service hash:
1. Update hash in `frontend/constants/serviceTemplates.ts`
2. Validate with `scripts/js/check_service_templates.ts`
3. Enable in `frontend/config/agents.ts`
4. Restart development server

## Notes

- The app uses self-signed certificates for localhost HTTPS (see `electron/utils/certificate.js`)
- Frontend uses Next.js static export mode for Electron embedding
- Build outputs must be copied from `frontend/.next` to `electron/.next`
- All agents communicate through the Python middleware layer
- Services interact with blockchain via ethers.js (v5.8.0)

## Plans
- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
