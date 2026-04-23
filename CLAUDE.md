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
- Node.js 22.18+ (see `.nvmrc`, enforced by `engines` in `package.json`)
- Yarn 1.22.0+
- Python 3.14 (see `pyproject.toml`: `>=3.14,<3.15`)
- Poetry 2.3.2+

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

1. **Frontend → Electron**: IPC via `contextBridge` (see `electron/preload.js` — treat that file as the source of truth for the API surface). Broad groupings:
   - Store operations: `electronAPI.store.{store,get,set,delete,clear}`
   - Window controls: `electronAPI.{closeApp,minimizeApp,setTrayIcon,setIsAppLoaded}`
   - Notifications: `electronAPI.showNotification`
   - Logging / support: `electronAPI.{saveLogs,saveLogsForSupport,cleanupSupportLogs,logEvent,nextLogError,readFile,openPath,getAppVersion}`
   - Managed child windows: `electronAPI.{onRampWindow,web3AuthWindow,web3AuthSwapOwnerWindow,termsAndConditionsWindow}` (each window has its own `show`/`close` + result callbacks)
   - In-app auto-updater: `electronAPI.autoUpdater.{checkForUpdates,downloadUpdate,cancelDownload,quitAndInstall,onUpdateAvailable,onDownloadProgress,onUpdateDownloaded,onUpdateError,onUpdateNotAvailable}`
   - Raw IPC escape hatch: `electronAPI.ipcRenderer.{send,on,invoke,removeListener}` — used sparingly; prefer the named APIs above.

2. **Electron → Python Backend**: Spawned child process communication
   - Backend runs via `poetry run python -m operate.cli daemon` in dev; in packaged builds, via the PyInstaller executable in `electron/bins/middleware/`.
   - HTTP API over localhost (self-signed cert). Frontend services in `frontend/service/` hit this API directly.

3. **Frontend State Management**:
   - React Context providers in `/frontend/context/` (one provider per folder). A non-exhaustive list of load-bearing providers: `ServicesProvider`, `BalanceProvider`, `StakingContractDetailsProvider`, `StakingProgramProvider`, `MasterWalletProvider`, `PearlWalletProvider`, `RewardProvider`, `SetupProvider`, `SettingsProvider`, `StoreProvider`, `PageStateProvider`, `OnRampProvider`, `OnlineStatusProvider`, `MessageProvider`, `SupportModalProvider`, `ElectronApiProvider`, `AutoRunProvider`, `BalancesAndRefillRequirementsProvider`. Read `frontend/context/` before assuming a provider doesn't exist.
   - Electron-native persistence via `electron-store` (`electron/store.js`) — see "Electron Store Schema" below. All other state (agent settings, auto-run, backup wallet, etc.) is persisted by the Python backend in `.operate/pearl_store.json` and accessed via HTTP.

### Service Templates & Agents

Service configurations live in the `frontend/constants/serviceTemplates/` directory:
- `serviceTemplates.ts` — combined `SERVICE_TEMPLATES` array (plus templates that don't warrant their own per-agent file, e.g. `AGENTS_FUN_COMMON_TEMPLATE`)
- `service/` — per-agent template files (currently `service/babydegen.ts` holds `MODIUS_SERVICE_TEMPLATE` and `OPTIMUS_SERVICE_TEMPLATE`; `service/trader.ts` holds `PREDICT_SERVICE_TEMPLATE` and `PREDICT_POLYMARKET_SERVICE_TEMPLATE`)
- `index.ts` — barrel export
- `constants.ts` — shared constants (e.g. `KPI_DESC_PREFIX`)

Each service template has a `hash`, `name`, `description`, and versioning.
- Agent types currently shipped: `PredictTrader`, `Modius`, `Optimus`, `AgentsFun`, `PettAi`, `Polystrat` (chain: Polygon, prediction-markets category).
- Chain-specific configurations in `configurations` object (funding requirements, staking programs, NFTs).
- See `docs/agent-integration-checklist.md` for the full agent-integration flow (agent repo → on-chain → middleware → Pearl frontend).

**When modifying service templates:**
1. Update `hash` in the correct per-agent file (e.g. `frontend/constants/serviceTemplates/service/babydegen.ts` for Modius/Optimus, `service/trader.ts` for PredictTrader/Polystrat), or in `serviceTemplates.ts` for templates that live there (AgentsFun, etc.)
2. Update corresponding `service_version` and `agent_release.repository.version` in the same file
3. Run `scripts/js/check_service_templates.ts` to validate
4. Ensure agent is enabled in `frontend/config/agents.ts` with `isAgentEnabled: true`

### Electron Store Schema

`electron/store.js` is now **Electron-native state only** — the schema is deliberately minimal:
- `environmentName` — dev/prod/tenderly environment marker.
- `knownVersion` — last app version the user ran (for upgrade detection).
- `updateAvailableKnownVersion` — version for which the "update available" modal was dismissed.
- `pearlStoreMigrationComplete` — set true once the Electron→`pearl_store.json` migration has run.
- `pearlStoreAutoRunRepaired` — set true once the one-shot `autoRun.enabled` repair has been checked.

**Everything else — per-agent settings (`trader`, `modius`, `optimus`, `pett_ai`, `memeooorr`, `polystrat`), `autoRun.*`, backup-wallet state, `lastSelectedAgentType`, etc. — lives in `.operate/pearl_store.json`** served by the Python backend. This moved so that store contents travel with the user's `.operate/` folder across machines. Legacy keys are still readable via `store.get()` (electron-store tolerates out-of-schema reads), and `StoreProvider` migrates them to the backend on first launch.

IPC handles: `store`, `store-get`, `store-set`, `store-delete`, `store-clear`. No `store-changed` broadcast is implemented — components observe backend store changes via React Query / providers.

### Python Backend

- The top-level `/operate/` folder is a **thin shim** — just `pearl.py` (PyInstaller entry point) and `tendermint.py` (Tendermint binary manager). There is no `__init__.py`; the real backend lives in `olas-operate-middleware`.
- `olas-operate-middleware` is **git-revision-pinned** in `pyproject.toml` (look for the `rev = "..."` hash), not a semver release. Every pin bump can change API response shapes — see "Backend Contract Types — Verify Against Installed Source" below. The installed source sits under `~/Library/Caches/pypoetry/virtualenvs/olas-operate-app-*/lib/python3.14/site-packages/operate/`.
- Dev entry: `poetry run python -m operate.cli daemon` (the `operate.cli` module comes from the middleware package).
- Packaged entry: PyInstaller executable in `electron/bins/middleware/`, built from `operate/pearl.py` via `build_pearl.sh`.
- Includes Tendermint binary for consensus (downloaded at build time).

### Build Process

Platform-specific builds:
- **macOS**: `build_pearl.sh` + `build.js` — ARM64 & x64 via `electron-builder`, notarized.
- **Windows**: `Makefile` (`make build`) + `build-win.js` / `build-win-tenderly.js`.
- **Linux**: `build-linux.js` (exists and is used by CI — Linux is a first-class target, not an afterthought).
- PyInstaller creates standalone executables in `electron/bins/middleware/`.
- Frontend built with environment-specific RPC endpoints; `build:frontend` copies `frontend/.next` → `electron/.next` and `frontend/public` → `electron/public`.
- Test/staging variant: `build.tester.js`.

## Key File Locations

- Main Electron entry: `electron/main.js`
- Electron preload (IPC surface): `electron/preload.js`
- Electron store (native schema): `electron/store.js`
- Electron feature modules (e.g. logs): `electron/features/`
- Electron child windows (on-ramp, web3auth, T&C): `electron/windows/`
- System tray component: `electron/components/PearlTray.js`
- Frontend entry: `frontend/pages/_app.tsx` (plus `index.tsx`, `onramp.tsx`, `web3auth.tsx`, `web3auth-swap-owner.tsx` — the last two are lightweight wrappers for Electron child windows)
- Components: `frontend/components/` — large (~29 top-level folders). Grouping: **shared UI** (`ui/`), **page/flow components** (`SetupPage/`, `MainPage/`, `SelectStakingPage/`, `SettingsPage/`, `UpdateAgentPage/`, `PearlWallet/`, `PearlDeposit/`, `AccountRecovery/`), **agent-specific** (`AgentStaking/`, `AgentWallet/`, `AgentForms/`, `AgentIntroduction/`, `AgentLowBalanceAlert/`, `AgentNft/`), **flows** (`Bridge/`, `OnRamp/`, `OnRampIframe/`, `Web3AuthIframe/`, `FundPearlWallet/`, `ConfirmSwitch/`), **modals/alerts** (`AchievementModal/`, `SupportModal/`, `ErrorBoundary/`), **utilities** (`ExportLogsButton/`, `Layout/`, `Pages/`, `custom-icons/`). Always grep before creating a new top-level folder.
- Domain types: `frontend/types/` (17 files — `Address.ts`, `Agent.ts`, `Autonolas.ts`, `BackupWallet.ts`, `Balance.ts`, `Bridge.ts`, `ElectronApi.ts`, `Epoch.ts`, `FundRecovery.ts`, `Funding.ts`, `Recovery.ts`, `Service.ts`, `Wallet.ts`, etc.). `Autonolas.ts` is the staking/rewards type hub; `ElectronApi.ts` defines `PearlStore`.
- Service definitions: `frontend/constants/serviceTemplates/` (directory — main array in `serviceTemplates.ts`, per-agent templates under `service/`)
- Agent configs: `frontend/config/agents.ts`
- Chain configs: `frontend/constants/chains.ts`
- Token configs: `frontend/config/tokens.ts`
- Staking programs: `frontend/constants/stakingProgram.ts`
- Feature docs: `docs/features/` (17 files — start here before touching a feature)
- AutoRun internals (hook hierarchy, timing constants, guard refs, start-status codes): `docs/features/autorun.md` — read this before changing anything under `frontend/context/AutoRunProvider/`
- Agent integration guide: `docs/agent-integration-checklist.md`
- Dev setup guides: `docs/dev/`
- Frontend test plan: `frontend/tests/TEST_PLAN.md`

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
1. Update hash in the per-agent file inside `frontend/constants/serviceTemplates/` (e.g. `service/babydegen.ts` for Modius/Optimus, `service/trader.ts` for PredictTrader/Polystrat, or `serviceTemplates.ts` for AgentsFun)
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
3. **Tests track the code, always.** Every source file you modify must have its test file updated in the **same** change — do not ship a code change and defer its test update. If a file has no tests yet, add one; don't treat "no existing tests" as a license to skip.
4. **After each phase:** Run `/review-implementation` and fix ALL issues found. Do not present code with known issues.
5. **For features touching 4+ files:** Work in phases — implement one screen + its tests, run `/review-implementation`, get review, then proceed to next screen. Never build all screens at once.

### Fix Globally, Not Locally

When you fix an issue in one file, **grep ALL files in your feature for the same pattern.** Examples:
- Fixed wrong `Alert` import in file A? Check files B, C, D for the same wrong import.
- Replaced a hardcoded color in file A? Search all your files for other hardcoded colors.
- Changed a heading level in one screen? Check all other screens for consistency.

### Component Imports — Use Custom Wrappers

`frontend/components/ui/` re-exports app-branded wrappers AND app-specific composite components. **The barrel at `frontend/components/ui/index.ts` is the authoritative list — read it before every feature.** Always import from `@/components/ui`, never from `antd`, when a wrapper exists.

Direct Ant Design overrides (same name as the antd component — using the antd import is a bug):

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
| `Typography` | `frontend/components/ui/Typography.tsx` | App-themed Title/Text/Paragraph defaults |

App-specific composites (also re-exported from `@/components/ui`) include `SetupCard`, `CardFlex`, `CardSection`, `MainContentContainer`, `BackButton`, `CopyAddress`, `AddressLink`, `FormFlex`, `NumberInput`, `RequiredMark`, `LoadingSpinner`, `IconContainer`, `TokenAmountInput`, `TokenRequirementsTable`, `TokenRequirementsDisplay`, `RequiredTokenList`, `FundingDescription`, `FundsAreSafeMessage`, `WalletTransferDirection`, `TransactionSteps`, `AgentSetupCompleteModal`, `FinishingSetupModal`, `MasterSafeCreationFailedModal`, plus `animations`, `forms`, `styles`, and `tooltips` sub-barrels. Before building a new widget, grep `frontend/components/ui/index.ts` — it is common for the thing you want to already exist.

Components with NO custom wrapper (e.g., `Button`, `Flex`, `Input`, `Form`, `Tag`) should be imported directly from `antd`.

### Colors — Use Constants

**Never hardcode hex colors.** Always read `frontend/constants/colors.ts` and use `COLOR.*` constants (`import { COLOR } from '@/constants'`). If a color doesn't exist, add it to `colors.ts` first — don't hardcode it inline.

`COLOR` exports both flat brand/neutral constants (e.g. `COLOR.PRIMARY`, `COLOR.WHITE`) and nested semantic groups:
- `COLOR.TEXT_COLOR.{SUCCESS,WARNING,ERROR}.DEFAULT` for status text
- `COLOR.BG.{SUCCESS,WARNING,ERROR}` for status background fills
- `COLOR.BORDER_COLOR.{SUCCESS,WARNING,ERROR}` for status borders
- `COLOR.ICON_COLOR.{...}` for icon tints

Prefer the semantic group (`COLOR.TEXT_COLOR.SUCCESS.DEFAULT`) over a flat alias when you're expressing intent (this is a success state), not a specific hue.

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

Services use a static object pattern with fetch-based API calls. Based on [frontend/service/FundRecovery.ts](frontend/service/FundRecovery.ts):

```typescript
const scan = async (
  request: FundRecoveryScanRequest,
): Promise<FundRecoveryScanResponse> =>
  fetch(`${BACKEND_URL}/fund_recovery/scan`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(request),
  }).then(async (res) => {
    if (res.ok) return res.json();
    const text = await res.text();
    let errorMsg: string;
    try {
      errorMsg =
        JSON.parse(text)?.error ?? 'Failed to scan for recoverable funds';
    } catch {
      errorMsg = 'Failed to scan for recoverable funds';
    }
    throw new Error(errorMsg);
  });

export const FundRecoveryService = { scan, execute };
```

Note the error handling: read response as text first, then try to parse JSON for an `error` field, fall back to a service-specific default message if parsing fails. Using `res.json()` directly on a failed response would throw when the backend returns a plain-text 5xx body.

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
- `factories.ts` — mock data (`makeService()`, `makeMasterEoa()`, staking factories, etc.)
- `contextDefaults.ts` — default context values (`createStakingProgramContextValue()`, etc.)
- `queryClient.ts` — test QueryClient (`createTestQueryClient()`, `createQueryClientWrapper()`)
- `autoRunMocks.ts` — AutoRun-specific provider/hook mocks (use these in any test that mounts a component depending on `AutoRunProvider`)

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
