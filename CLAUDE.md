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

## Frontend Coding Conventions

**CRITICAL: Read this section before writing ANY frontend code. These rules are non-negotiable.**

### Before You Code — Discovery Checklist

Before writing a single line of code for any frontend feature, complete these steps:

1. **Read `frontend/components/ui/index.ts`** — know every custom UI wrapper that exists. Never import a component directly from `antd` if a custom wrapper exists in `@/components/ui`.
2. **Read `frontend/constants/colors.ts`** — know every `COLOR.*` constant. Never hardcode hex color values.
3. **Read `frontend/styles/globals.scss`** — know what utility classes and Ant Design overrides exist. Check for custom CSS classes before adding inline style overrides.
4. **Read one existing similar screen** — if building a setup screen, read another setup screen first. If building a modal, read how existing modals work. Match the patterns exactly.
5. **Read `frontend/tests/helpers/factories.ts`** — know what test factories exist before creating inline mock data.

### Workflow Commands

**These are not optional. They are part of the standard coding workflow.**

1. **Before coding:** Run `/pre-implementation-check` and report findings. Do not write code until the report is acknowledged.
2. **During coding:** After modifying any `.tsx`/`.ts` file, run `yarn lint:frontend --fix` immediately. Do not accumulate lint errors.
3. **After each phase:** Run `/review-implementation` and fix ALL issues found. Do not present code with known issues.
4. **For features touching 4+ files:** Work in phases — implement one screen + its tests, run `/review-implementation`, get review, then proceed to next screen. Never build all screens at once.

### Fix Globally, Not Locally

When you fix an issue in one file, **grep ALL files in your feature for the same pattern.** Examples:
- Fixed wrong `Alert` import in file A? Check files B, C, D for the same wrong import.
- Replaced a hardcoded color in file A? Search all your files for other hardcoded colors.
- Changed a heading level in one screen? Check all other screens for consistency.

### Component Imports — Use Custom Wrappers

The following components have custom wrappers in `frontend/components/ui/`. **Always import from `@/components/ui`, never from `antd`:**

| Component | Source | Custom wrapper provides |
|-----------|--------|----------------------|
| `Alert` | `frontend/components/ui/Alert.tsx` | App color scheme via `.custom-alert--{type}` CSS classes (primary/info/warning/error/success), custom icons |
| `Modal` | `frontend/components/ui/Modal.tsx` | Structured layout with `header`, `title`, `description`, `action` props; three sizes (small/medium/large); consistent padding/centering |
| `Table` | `frontend/components/ui/Table.tsx` | Custom header/body styling, rounded corners |
| `Collapse` | `frontend/components/ui/Collapse.tsx` | Custom spacing, expand icon sizing |
| `Divider` | `frontend/components/ui/Divider.tsx` | Margin reset, custom border color |
| `Progress` | `frontend/components/ui/Progress.tsx` | Border radius for progress bars |
| `Segmented` | `frontend/components/ui/Segmented.tsx` | Custom styling with activeIconColored prop |
| `Steps` | `frontend/components/ui/Steps.tsx` | Styled wrapper |
| `SetupCard` | `frontend/components/ui/SetupCard.tsx` | White card container with max-width 516px, shadow, border-radius 16px — used for all setup flow screens |

Any component NOT listed above (e.g., `Button`, `Flex`, `Input`, `Typography`, `Form`, `Tag`) should be imported directly from `antd`. When in doubt, check `frontend/components/ui/index.ts` for the current list.

### Colors — Use Constants

**Never hardcode hex colors.** Always read `frontend/constants/colors.ts` and use `COLOR.*` constants (`import { COLOR } from '@/constants'`). If a color doesn't exist, add it to `colors.ts` first — don't hardcode it inline.

### Styling Patterns

The codebase uses three styling approaches in this priority order:

1. **`styled-components`** — for reusable styled wrappers. Define in the same file as the component. Use transient props (`$propName`) to avoid passing to DOM.
2. **SCSS utility classes from `globals.scss`** — for spacing, typography, layout. Apply via `className`. Examples: `m-0`, `mt-12`, `mb-8`, `text-sm`, `text-center`, `text-neutral-secondary`, `flex`, `w-full`.
3. **Inline `style={{ }}`** — only for truly dynamic values or one-off overrides. Never for repeated patterns.

**Never:**
- Duplicate existing styled components (e.g., don't recreate `SetupCard` styles as an inline object)
- Use inline styles for colors that exist in `COLOR.*`
- Add `borderRadius: 8` or similar when the custom component handles its own styling

### Design-to-Code Rules

When implementing from a design spec or Figma:
- **Copy text verbatim.** Never paraphrase, shorten, or "improve" design text. If the design says "Enter the 12-word recovery phrase of the lost Pearl account", that is what the code must render — not "Enter your recovery phrase".
- **Match exact props.** If the design shows a large heading, use `level={3}`. If it shows a standard input, don't add `size="small"`. If it shows a ghost button, use `type="default"` not `type="primary"`.
- **Match layout structure.** If the design shows two separate cards, render two `<SetupCard>` components with a gap — not one card with a divider. If it shows borderless rows, don't add `border` and `background`.
- **Match button width.** If the design shows a compact left-aligned button, add `style={{ alignSelf: 'flex-start' }}`. Don't let `Flex vertical` stretch it to full width.

### Backend Contract Types — Verify Against Installed Source, Not Docs

**TypeScript types for backend responses must match what the middleware actually returns, not what a design doc / audit / scoping spec *said* it should return.** Design docs describe the scoped intent; implementation can drift (renamed fields, added fields, reshaped payloads). Drift is silent because TypeScript's structural typing only validates fields you *use* — a wrongly-typed field no one reads is a ticking bomb.

**Before writing or updating a TypeScript type that represents a backend response:**

1. Find the installed Python source at `~/Library/Caches/pypoetry/virtualenvs/olas-operate-app-*/lib/python*/site-packages/operate/`.
2. Grep for the endpoint handler and read the exact `return` dict / `JSONResponse` body.
3. Copy field names character-by-character. Don't paraphrase, don't rely on the audit.
4. If there's a wallet/status method that constructs part of the response (e.g. `backup_owner_status` in `operate/wallet/master.py`), read that too — the API handler often just forwards its return value.

**On every `olas-operate-middleware` pin bump in `pyproject.toml`**, re-verify response shapes for every endpoint we call, not just that routes still exist. A route can exist with a different return shape.

**When a feature depends on an unreleased backend PR:** treat any audit / scoping doc you wrote as *history*. Always re-read the installed source after every pin update. Do NOT assume the audit reflects the shipped code.

**Red flags that a contract mismatch is lurking:**
- A response field in our type that no component reads.
- A test fixture that constructs a response from scratch (vs. replaying a real backend response).
- A type you haven't re-checked since the middleware pin was last bumped.

### Service Pattern

Services use a static object pattern with fetch-based API calls:

```typescript
const scanFunds = async (request: ScanRequest): Promise<ScanResponse> =>
  fetch(`${BACKEND_URL}/fund_recovery/scan`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  }).then(async (res) => {
    if (res.ok) return res.json();
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Operation failed');
  });

export const FundRecoveryService = { scanFunds, executeFunds };
```

### Hook Pattern

Hooks wrap React Query mutations/queries or context access:

```typescript
// Mutation hook
export const useFundRecoveryScan = () => {
  return useMutation({
    mutationFn: FundRecoveryService.scan,
  });
};

// Context hook
export const useSetup = () => useContext(SetupContext);
```

### Test Pattern

Tests use factories from `frontend/tests/helpers/`:
- `factories.ts` — mock data (`makeService()`, `makeMasterEoa()`, etc.)
- `contextDefaults.ts` — default context values (`createStakingProgramContextValue()`)
- `queryClient.ts` — test QueryClient (`createTestQueryClient()`, `createQueryClientWrapper()`)

Mock pattern:
```typescript
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('ethers-multicall', () => require('../mocks/ethersMulticall').ethersMulticallMock);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
```

Always pair `eslint-disable` with `eslint-enable` in test files.

### Import Conventions

- Use `@/` alias for cross-directory imports: `import { COLOR } from '@/constants'`
- Use relative paths within the same directory: `import { SubComponent } from './SubComponent'`
- Barrel exports exist for: `@/components/ui`, `@/hooks`, `@/constants`, `@/types`
- Import order (enforced by `simple-import-sort`): external packages → `@/` aliases → relative paths

## Code Style
- Never use `// eslint-disable-next-line`. Fix the code instead.

## Plans
- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
