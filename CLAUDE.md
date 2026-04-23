# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pearl is a cross-platform Electron desktop application for running autonomous agents powered by the OLAS Network. Three main layers:

1. **Electron App** (CommonJS) — `/electron/`
2. **Next.js Frontend** (TypeScript) — `/frontend/`
3. **Python Backend** (Poetry) — `/operate/`

The frontend is embedded in Electron via Next.js; they communicate with the Python backend through IPC channels and local HTTP.

## Development Commands

**Prerequisites:** Node.js 22.18+ (`.nvmrc`), Yarn 1.22+, Python 3.14 (`pyproject.toml`: `>=3.14,<3.15`), Poetry 2.3.2+.

Common commands (full list in `package.json` scripts):
- `yarn install-deps` — installs all three layers
- `yarn dev` — Electron app with hot reload
- `yarn dev:frontend` — frontend only (port 3000)
- `yarn dev:backend` — Python middleware
- `yarn dev:hardhat` — local Hardhat node
- `yarn test:frontend`, `yarn lint:frontend [--fix]`, `yarn quality-check:frontend`
- `yarn build:frontend`, `yarn build:pearl` (full app via `build_pearl.sh`), `yarn download-binaries`

## Architecture Details

### Communication Flow

The application uses a multi-layered communication architecture:

1. **Frontend → Electron**: IPC via `contextBridge` (see `electron/preload.js` — source of truth for the API surface). Broad groupings:
   - Store operations: `electronAPI.store.{store,get,set,delete,clear}`
   - Window controls: `electronAPI.{closeApp,minimizeApp,setTrayIcon,setIsAppLoaded}`
   - Notifications: `electronAPI.showNotification`
   - Logging / support: `electronAPI.{saveLogs,saveLogsForSupport,cleanupSupportLogs,logEvent,nextLogError,readFile,openPath,getAppVersion}`
   - Managed child windows: `electronAPI.{onRampWindow,web3AuthWindow,web3AuthSwapOwnerWindow,termsAndConditionsWindow}` (each window has `show`/`close` + result callbacks)
   - In-app auto-updater: `electronAPI.autoUpdater.{checkForUpdates,downloadUpdate,cancelDownload,quitAndInstall,onUpdateAvailable,onDownloadProgress,onUpdateDownloaded,onUpdateError,onUpdateNotAvailable}`
   - Raw IPC escape hatch: `electronAPI.ipcRenderer.{send,on,invoke,removeListener}` — used sparingly; prefer the named APIs.

2. **Electron → Python Backend**: Spawned child process communication
   - Dev: `poetry run python -m operate.cli daemon`. Packaged: PyInstaller executable in `electron/bins/middleware/`.
   - HTTP API over localhost (self-signed cert). Frontend services in `frontend/service/` hit this API directly.

3. **Frontend State Management**:
   - React Context providers in `/frontend/context/` (one provider per folder). Non-exhaustive list of load-bearing providers: `ServicesProvider`, `BalanceProvider`, `StakingContractDetailsProvider`, `StakingProgramProvider`, `MasterWalletProvider`, `PearlWalletProvider`, `RewardProvider`, `SetupProvider`, `SettingsProvider`, `StoreProvider`, `PageStateProvider`, `OnRampProvider`, `OnlineStatusProvider`, `MessageProvider`, `SupportModalProvider`, `ElectronApiProvider`, `AutoRunProvider`, `BalancesAndRefillRequirementsProvider`. Read `frontend/context/` before assuming a provider doesn't exist.
   - Electron-native persistence via `electron-store` (`electron/store.js`) — see Electron Store Schema below. All other state lives in `.operate/pearl_store.json` served by the Python backend.

### Service Templates & Agents

Service configurations live in the `frontend/constants/serviceTemplates/` directory:
- `serviceTemplates.ts` — combined `SERVICE_TEMPLATES` array (plus templates without their own file, e.g. `AGENTS_FUN_COMMON_TEMPLATE`)
- `service/` — per-agent template files (`service/babydegen.ts` holds Modius/Optimus; `service/trader.ts` holds PredictTrader/Polystrat)
- `index.ts` — barrel; `constants.ts` — shared constants

Each service template has a `hash`, `name`, `description`, and versioning. Agents currently shipped: `PredictTrader`, `Modius`, `Optimus`, `AgentsFun`, `PettAi`, `Polystrat`. Chain-specific config (funding requirements, staking programs, NFTs) is in the template's `configurations` object. See `docs/agent-integration-checklist.md` for full agent-integration flow.

**When modifying service templates:** update `hash` in the correct per-agent file, update `service_version` + `agent_release.repository.version` in the same file, run `scripts/js/check_service_templates.ts`, ensure `isAgentEnabled: true` in `frontend/config/agents.ts`.

### Electron Store Schema

`electron/store.js` is now **Electron-native state only** — the schema is deliberately minimal:
- `environmentName` — dev/prod/tenderly environment marker
- `knownVersion` — last app version the user ran (upgrade detection)
- `updateAvailableKnownVersion` — version for which the "update available" modal was dismissed
- `pearlStoreMigrationComplete` — set true once the Electron→`pearl_store.json` migration has run
- `pearlStoreAutoRunRepaired` — set true once the one-shot `autoRun.enabled` repair has been checked

**Everything else — per-agent settings (`trader`, `modius`, `optimus`, `pett_ai`, `memeooorr`, `polystrat`), `autoRun.*`, backup-wallet state, `lastSelectedAgentType`, etc. — lives in `.operate/pearl_store.json`** served by the Python backend, so store contents travel with the user's `.operate/` folder across machines. Legacy keys are still readable via `store.get()` (electron-store tolerates out-of-schema reads) and `StoreProvider` migrates them on first launch.

IPC handles: `store`, `store-get`, `store-set`, `store-delete`, `store-clear`. No `store-changed` broadcast — components observe backend store changes via React Query / providers.

### Python Backend

- `/operate/` is a **thin shim** — `pearl.py` (PyInstaller entry) and `tendermint.py` (Tendermint binary manager). No `__init__.py`; the real backend lives in `olas-operate-middleware`.
- `olas-operate-middleware` is **git-revision-pinned** in `pyproject.toml` (not semver). Every pin bump can change API response shapes — see Backend Contract Types below. Installed source: `~/Library/Caches/pypoetry/virtualenvs/olas-operate-app-*/lib/python3.14/site-packages/operate/`.
- Dev entry: `poetry run python -m operate.cli daemon`. Packaged: PyInstaller executable in `electron/bins/middleware/`, built from `operate/pearl.py` via `build_pearl.sh`. Includes Tendermint binary for consensus.

### Build Process

- **macOS**: `build_pearl.sh` + `build.js` — ARM64 & x64 via `electron-builder`, notarized.
- **Windows**: `Makefile` (`make build`) + `build-win.js` / `build-win-tenderly.js`.
- **Linux**: `build-linux.js` (first-class target — used in CI).
- PyInstaller creates executables in `electron/bins/middleware/`. `build:frontend` copies `frontend/.next` → `electron/.next` and `frontend/public` → `electron/public`. Test/staging variant: `build.tester.js`.

## Key File Locations

- Main Electron entry: `electron/main.js`
- Electron preload (IPC surface): `electron/preload.js`
- Electron store (native schema): `electron/store.js`
- Electron feature modules (e.g. logs): `electron/features/`
- Electron child windows (on-ramp, web3auth, T&C): `electron/windows/`
- System tray component: `electron/components/PearlTray.js`
- Frontend entry: `frontend/pages/_app.tsx` (plus `index.tsx`, `onramp.tsx`, `web3auth.tsx`, `web3auth-swap-owner.tsx` — last two are Electron child-window wrappers)
- Components: `frontend/components/` — ~29 top-level folders grouped into **shared UI** (`ui/`), **page/flow** (`SetupPage/`, `MainPage/`, `SelectStakingPage/`, `SettingsPage/`, `UpdateAgentPage/`, `PearlWallet/`, `PearlDeposit/`, `AccountRecovery/`), **agent-specific** (`AgentStaking/`, `AgentWallet/`, `AgentForms/`, `AgentIntroduction/`, `AgentLowBalanceAlert/`, `AgentNft/`), **flows** (`Bridge/`, `OnRamp/`, `OnRampIframe/`, `Web3AuthIframe/`, `FundPearlWallet/`, `ConfirmSwitch/`), **modals/alerts** (`AchievementModal/`, `SupportModal/`, `ErrorBoundary/`), **utilities** (`ExportLogsButton/`, `Layout/`, `Pages/`, `custom-icons/`). Grep before creating a new top-level folder.
- Domain types: `frontend/types/` (17 files — `Autonolas.ts` is staking/rewards hub; `ElectronApi.ts` defines `PearlStore`)
- Service definitions: `frontend/constants/serviceTemplates/` (directory)
- Agent configs: `frontend/config/agents.ts`
- Chain configs: `frontend/constants/chains.ts`
- Token configs: `frontend/config/tokens.ts`
- Staking programs: `frontend/constants/stakingProgram.ts`
- Feature docs: `docs/features/` (17 files — start here before touching a feature)
- AutoRun internals (hook hierarchy, timing constants, guard refs, start-status codes): `docs/features/autorun.md`
- Agent integration guide: `docs/agent-integration-checklist.md`
- Dev setup guides: `docs/dev/`
- Frontend test plan: `frontend/tests/TEST_PLAN.md`

## Commit Conventions

Conventional commits: `feat(scope):`, `fix(scope):`, `chore(scope):`, `docs(scope):`, `refactor(scope):`, `test(scope):`.

Examples: `feat(trader): add new prediction strategy`, `fix(balance): correct USDC balance calculation`, `chore: bump version to 1.1.9-rc2 [skip release]`.

## Testing Locally

To test with a custom service hash: update the hash in the per-agent file under `frontend/constants/serviceTemplates/` (e.g. `service/babydegen.ts` for Modius/Optimus, `service/trader.ts` for PredictTrader/Polystrat, or `serviceTemplates.ts` for AgentsFun), validate with `scripts/js/check_service_templates.ts`, enable in `frontend/config/agents.ts`, restart dev server.

## Notes

- Self-signed certificates for localhost HTTPS (see `electron/utils/certificate.js`)
- Frontend uses Next.js static export mode for Electron embedding
- Build outputs must be copied from `frontend/.next` to `electron/.next`
- All agents communicate through the Python middleware layer
- Blockchain via ethers.js (v5.8.0)

## Frontend Coding Conventions

**CRITICAL: These are non-negotiable.**

### Workflow

Run `/pre-implementation-check` before writing frontend code. Run `/review-implementation` after each phase. Update tests in the same change as the source file — never defer. For features touching 4+ files, work in phases with `/review-implementation` between them. Run `yarn lint:frontend --fix` after every edit; don't accumulate lint errors.

### Fix globally

When you fix an issue in one file, grep every other file you've touched in the same feature for the same pattern. Partial fixes that don't sweep the whole feature leave silent inconsistencies.

### Component imports — use custom wrappers

`frontend/components/ui/` re-exports app-branded wrappers AND composite components. **The barrel at `frontend/components/ui/index.ts` is authoritative — grep it before writing UI.** Always import from `@/components/ui`, never from `antd`, when a wrapper exists.

Direct Ant Design overrides (using the `antd` import for these is a bug):

| Component | Custom wrapper provides |
|-----------|----------------------|
| `Alert` | App color scheme via `.custom-alert--{type}` classes, custom icons |
| `Modal` | Structured layout (`header`/`title`/`description`/`action` props); three sizes; consistent padding/centering |
| `Table` | Custom header/body styling, rounded corners |
| `Collapse` | Custom spacing, expand icon sizing |
| `Divider` | Margin reset, custom border color |
| `Progress` | Border radius for progress bars |
| `Segmented` | `activeIconColored` prop |
| `Steps` | Styled wrapper |
| `Typography` | App-themed Title/Text/Paragraph defaults |

App-specific composites (`SetupCard`, `CardFlex`, `BackButton`, `CopyAddress`, `TokenAmountInput`, `TokenRequirementsTable`, `FinishingSetupModal`, ~20 more) also live in `@/components/ui` — grep the barrel before writing anything new.

Components with no wrapper (`Button`, `Flex`, `Input`, `Form`, `Tag`) come directly from `antd`.

### Colors — Use Constants

**Never hardcode hex colors.** Import `COLOR` from `@/constants`. If a color is missing, add it to `frontend/constants/colors.ts` — never inline.

`COLOR` exports flat brand/neutral constants AND nested semantic groups: `COLOR.TEXT_COLOR.{SUCCESS,WARNING,ERROR}.DEFAULT`, `COLOR.BG.*`, `COLOR.BORDER_COLOR.*`, `COLOR.ICON_COLOR.*`. Prefer the semantic group when expressing intent (success state) over a flat hue alias.

### Styling priority

1. `styled-components` for reusable styled wrappers (transient `$propName` props to avoid DOM leakage)
2. SCSS utility classes from `globals.scss` (`m-0`, `mt-12`, `text-sm`, `text-center`, `flex`, `w-full`, padding/margin/gap/width/height families)
3. Inline `style={{}}` only for truly dynamic one-off values

Never duplicate styles from `@/components/ui` components (don't recreate `SetupCard` as inline objects). Never use inline styles for colors that exist in `COLOR.*`. Never add `borderRadius: 8` when the custom component already handles its own styling.

### Backend Contract Types — Verify Against Installed Source

TypeScript types for backend responses must match what the middleware actually returns, **not what a design doc / scoping spec said**. Implementation drifts (renamed fields, reshaped payloads), and TypeScript's structural typing silently accepts mismatches in fields nobody reads — a ticking bomb.

Before writing or updating a backend-response type:
1. Open installed source at `~/Library/Caches/pypoetry/virtualenvs/olas-operate-app-*/lib/python*/site-packages/operate/`.
2. Find the endpoint handler; read the exact `return` / `JSONResponse` body; copy field names character-by-character.
3. If the handler forwards a helper method's return (e.g. `backup_owner_status` in `operate/wallet/master.py`), read that too.

**Re-verify all endpoint shapes on every `olas-operate-middleware` pin bump in `pyproject.toml`.** If a feature depends on an unreleased backend PR, treat scoping audits as history and re-read the installed source after every pin update.

Red flags: response field no component reads; test fixture built from scratch rather than replaying a real backend response; type not checked since the last pin bump.

### Service / Hook / Test patterns

For canonical shapes, **read an existing sibling**: [frontend/service/FundRecovery.ts](frontend/service/FundRecovery.ts) for a service, [frontend/hooks/useFundRecoveryScan.ts](frontend/hooks/useFundRecoveryScan.ts) for a mutation hook. Conventions: services are static objects of fetch-based async methods with text-first error handling; hooks wrap React Query or context access. For test patterns (jest.mock, factories, eslint-disable/enable pairing), see the `write-tests` skill.

### Frontend Coverage Workflow

When adding or reviewing frontend tests, use `frontend/tests/TEST_PLAN.md` as the source of truth for phase scope and read the matching feature doc in `docs/features/` before writing suites.

- Reuse `frontend/tests/helpers/factories.ts` first. Override only the field the case requires — don't restate defaults.
- Local helpers in a suite should be thin wrappers over shared factories, not a second fixture system.
- Split by ownership: providers cover query wiring/polling/refetch/merge; hooks cover derivation; components cover rendering and interaction with mocked hooks/providers.
- If the same payload shape appears in two suites, promote to `factories.ts` before adding more inline literals.
- For Phase 4 staking/rewards work, start with the shared staking factories (`makeStakingContractDetails`, `makeServiceStakingDetails`, `makeRawStakingRewardsInfo`, `makeStakingRewardsInfo`, `makeRewardsHistoryEntry`, `makeRewardsHistoryServiceResponse`) and follow the staged execution order in `TEST_PLAN.md`.

### Import conventions

- `@/` alias for cross-directory imports: `import { COLOR } from '@/constants'`
- Relative paths within the same directory: `import { SubComponent } from './SubComponent'`
- Barrel exports exist for `@/components/ui`, `@/hooks`, `@/constants`, `@/types`
- Import order (enforced by `simple-import-sort`): external → `@/` aliases → relative

## Code Style

- Never use `// eslint-disable-next-line`. Fix the code instead.

## Plans

- Make plans extremely concise. Sacrifice grammar for concision.
- End each plan with a list of unresolved questions, if any.
