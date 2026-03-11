# Copilot Coding Agent Instructions

## Project Overview

**Pearl** is a cross-platform Electron desktop application for running autonomous agents powered by the OLAS Network. The architecture has three layers:

1. **Electron App** (`electron/`) – CommonJS desktop wrapper, main process, IPC, system tray, store.
2. **Next.js Frontend** (`frontend/`) – TypeScript + React UI embedded inside Electron.
3. **Python Backend** (`operate/`) – Thin wrapper around `olas-operate-middleware`; spawned as a child process.

The frontend communicates with the backend exclusively via a local HTTPS REST API (`https://localhost:8765/api/v2` in production).

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22.18 (use `.nvmrc`) |
| Yarn | 1.22.0+ |
| Python | 3.14 |
| Poetry | 2.3.2+ |

---

## Installation

```bash
# Install all dependencies (Node + Python) in one step
yarn install-deps

# Or individually:
yarn                    # Electron/root dependencies
yarn install:frontend   # Next.js/React frontend
yarn install:backend    # Python backend (poetry install --no-root)
```

---

## Development Commands

```bash
yarn dev                # Launch full Electron app (hot reload)
yarn dev:frontend       # Next.js dev server on port 3000 (no Electron)
yarn dev:backend        # Python middleware daemon only
yarn dev:hardhat        # Local Hardhat blockchain for testing
```

---

## Quality Checks (run before every PR)

```bash
# Frontend linting (ESLint + Prettier)
yarn lint:frontend
yarn lint:frontend --fix   # Auto-fix

# TypeScript type checking (strict mode)
yarn typequality-check:frontend

# Combined lint + typecheck
yarn quality-check:frontend

# Unit tests (Jest, jsdom environment)
yarn test:frontend
```

All checks also run in CI (`.github/workflows/frontend.yml`). PRs must pass CI before merging.

---

## Build Commands

```bash
yarn build:frontend    # Next.js build → copies to electron/.next & electron/public
yarn build:pearl       # Full Pearl release (runs build_pearl.sh)
yarn download-binaries # Download required external binaries
```

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Electron main process | `electron/main.js` |
| IPC bridge (preload) | `electron/preload.js` |
| Persistent store schema | `electron/store.js` |
| Frontend entry | `frontend/pages/_app.tsx` |
| Context provider hierarchy | `frontend/pages/_app.tsx` (provider nesting order) |
| All context providers | `frontend/context/` |
| Custom hooks | `frontend/hooks/` (60+ hooks) |
| REST API service layer | `frontend/service/Services.ts` |
| Agent-specific services | `frontend/service/agents/` |
| Agent type definitions | `frontend/config/agents.ts` |
| Service templates (IPFS hashes) | `frontend/constants/serviceTemplates/` |
| Chain configuration | `frontend/constants/chains.ts` |
| URL constants | `frontend/constants/urls.ts` |
| Theme / design tokens | `frontend/constants/theme/` |
| Ant Design breakpoints | `frontend/constants/theme/width.ts` |
| ABI files | `frontend/abis/` |
| Jest configuration | `frontend/jest.config.ts` |
| Jest tests | `frontend/tests/` (mirrors source paths) |
| Python entry point | `operate/pearl.py` |
| Documentation | `docs/` and `docs/dev/` |
| Pull request template | `.github/pull_request_template.md` |

---

## Architecture Details

### IPC Communication (Electron ↔ Frontend)

The `electron/preload.js` exposes a typed bridge via `contextBridge`:

```javascript
// Frontend calls (ipcRenderer.invoke / send):
window.electron.web3Auth.show()
window.electron.web3Auth.close()
window.electron.onRampWindow.show(amount, network, crypto)
window.electron.app.closeApp()
window.electron.app.minimizeApp()
window.electron.app.setTrayIcon(status)
window.electron.log.info(message)

// Electron → Frontend events (ipcRenderer.on):
'is-app-loaded'
'store-changed'
'tray'
```

### Frontend → Python Backend

All API calls use `fetch()` to the local HTTPS backend:

```typescript
// BACKEND_URL_V2 = https://localhost:{8765|8000}/api/v2
fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}`, {
  method: 'GET',
  headers: { ...CONTENT_TYPE_JSON_UTF8 },
  signal,   // AbortSignal – always pass to avoid memory leaks
}).then(response => {
  if (response.ok) return response.json();
  throw new Error('...');
});
```

Always pass an `AbortSignal` to prevent memory leaks on unmount.

### State Management

| Layer | Technology | Use |
|-------|-----------|-----|
| Server state | React Query (`@tanstack/react-query`) | API data, caching, mutations |
| Application state | React Context (18+ providers) | Global app state |
| UI state | `useState` / `useReducer` | Component-local state |
| Persistent settings | `electron-store` via `ElectronApiProvider` | Cross-session persistence |

**Provider nesting order** matters – see `frontend/pages/_app.tsx` for the exact hierarchy. Add new providers at the correct layer to avoid missing context.

### Agent Types

```typescript
// frontend/config/agents.ts
type AgentType = 'trader' | 'memeooorr' | 'modius' | 'optimus' | 'pett_ai' | 'polymarket_trader'
```

Each agent config (`AGENT_CONFIG` map) contains:
- `isAgentEnabled` – must be `true` for the agent to appear in the UI
- `evmHomeChainId` – the EVM chain this agent operates on
- `middlewareHomeChainId` – middleware chain identifier
- `agentIds` – on-chain agent IDs
- `requiresSetup` – whether agent configuration form is shown
- `isUnderConstruction` – hides agent from production listings

**Active agent list**: `ACTIVE_AGENTS` and `AVAILABLE_FOR_ADDING_AGENTS` are exported from `frontend/config/agents.ts`.

### Service Templates

Located in `frontend/constants/serviceTemplates/`. Each template has:
- `hash` – IPFS hash of the service code
- `service_version` – semver string
- `agent_release.repository.version` – GitHub release tag
- `env_variables` – per-variable provision type:
  - `COMPUTED` – auto-calculated (addresses, RPCs)
  - `USER` – user-provided (API keys)
  - `FIXED` – hard-coded defaults

When updating a service template:
1. Update `hash` in the template file
2. Update `service_version` and `agent_release.repository.version`
3. Validate: `npx ts-node scripts/js/check_service_templates.ts`
4. Ensure `isAgentEnabled: true` in `frontend/config/agents.ts`

### Electron Store Schema

```javascript
// electron/store.js
// Global settings
store.get('environmentName')       // 'production' | 'staging' | 'dev'
store.get('lastSelectedAgentType') // AgentType string
store.get('knownVersion')          // string

// Per-agent settings (trader, memeooorr, modius, optimus, pett_ai)
store.get('trader.isInitialFunded')
store.get('trader.isProfileWarningDisplayed')
```

Store changes broadcast `'store-changed'` IPC event to the renderer.

---

## Styling Conventions

1. **Styled Components** (primary) – CSS-in-JS for all component-scoped styles.
2. **Ant Design v5** – UI component library with custom theme tokens in `frontend/constants/theme/`.
3. **Global SCSS** – `frontend/styles/globals.scss` for resets and font imports only.
4. **No CSS Modules** – do not introduce them; use Styled Components instead.
5. **Breakpoints** – use `ANTD_BREAKPOINTS` from `frontend/constants/theme/width.ts` in media queries.

---

## URL Constants

All URLs must use the `Url` template-literal type from `frontend/constants/urls.ts`:

```typescript
type Url = `http${'s' | ''}://${string}`;
```

Add new URLs to `frontend/constants/urls.ts` with this type annotation.

---

## Testing

- Tests live under `frontend/tests/` and **mirror source paths**.
- Jest only matches `frontend/tests/**/*.test.{ts,tsx}`.
- Test environment is `jsdom` (configured in `frontend/jest.config.ts`).
- Setup file: `frontend/jest.setup.ts`.

```bash
yarn test:frontend              # Run all tests
cd frontend && yarn test --watch          # Watch mode
cd frontend && yarn test --coverage       # Coverage report
```

---

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): concise description

[optional body]
[optional footer with issue reference]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(trader): add new prediction strategy
fix(balance): correct USDC balance calculation
chore: bump version to 1.1.9-rc2 [skip release]
refactor(context): simplify provider hierarchy
```

---

## Pull Request Process

1. Comment on the issue before starting work.
2. Create a branch: `feature/your-feature` or `fix/issue-number-description`.
3. Make focused, atomic commits with conventional messages.
4. Run `yarn quality-check:frontend` and `yarn test:frontend` before pushing.
5. Open a PR referencing the issue (e.g., "Closes #123").
6. All CI checks (`.github/workflows/frontend.yml`, `backend.yml`) must pass.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in RPC URLs for local development:

```
NODE_ENV=development
GNOSIS_RPC=
ETHEREUM_RPC=
OPTIMISM_RPC=
BASE_RPC=
MODE_RPC=
CELO_RPC=
POLYGON_RPC=
```

The frontend uses `BACKEND_URL_V2`:
- **Production**: `https://localhost:8765/api/v2`
- **Development**: `https://localhost:8000/api/v2`

---

## Platform-Specific Notes

- **macOS**: Primary development platform. Uses `build_pearl.sh` for ARM64 and x64 builds.
- **Windows**: Development support is experimental. See `docs/dev/windows-setup.md`.
- **Linux**: Release via `Makefile` targets. See `docs/dev/ubuntu-setup.md`.
- The backend uses **self-signed certificates** for localhost HTTPS (see `electron/utils/certificate.js`).
- Frontend is built as a **Next.js static export** (`output: 'export'`) for Electron embedding.
- Build output must be copied from `frontend/.next` to `electron/.next`.

---

## Common Errors & Workarounds

- **`yarn install` fails on Python deps**: Ensure Poetry 2.3.2+ is installed and `python3.14` is on PATH.
- **Backend certificate errors in dev**: The app uses a self-signed cert; the Electron main process registers it via `app.on('certificate-error', ...)`.
- **Type errors after adding a new agent**: Ensure all `AgentType` union members are handled in every switch/map that covers agent types.
- **Service hash mismatch**: After updating a service template hash, always run the validation script and restart the backend.
- **Windows path issues**: Use `path.join` (Node) for all file paths; never hardcode `/` separators.
- **React Query stale data**: Pass the correct `queryKey` including all parameters that affect the result, so cache invalidation works correctly.
- **IPC events not received**: Check that the renderer calls `ipcRenderer.on` inside a `useEffect` and removes the listener on cleanup.

---

## CI/CD Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `frontend.yml` | Push / PR | ESLint, TypeScript, Jest |
| `backend.yml` | Push / PR | Python linting and tests |
| `codeql.yml` | Push / PR | Security scanning |
| `gitleaks.yml` | Push / PR | Secret detection |
| `release.yml` | Tag push | macOS release build |
| `release_win.yml` | Tag push | Windows release build |
| `release_linux.yml` | Tag push | Linux release build |
| `production-release.yml` | Manual | Production promotion |

When CI fails, check the workflow logs via the GitHub Actions tab or the `github-mcp-server-actions_list` / `get_job_logs` tools.
