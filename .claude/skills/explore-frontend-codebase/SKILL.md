---
name: explore-frontend-codebase
description: Technical planning for Pearl frontend features and bugs. Produces a complete architectural plan with file list, data flow, visual specs, phased execution, and test strategy. Use when given a functional requirement or bug to plan.
disable-model-invocation: true
---

# Pearl App — Technical Planning Mode

You are acting as a technical planning partner for the **Pearl app** (`olas-operate-app`). Pearl is a cross-platform Electron desktop app for running autonomous OLAS agents. It has three layers: Electron (CommonJS), Next.js frontend (TypeScript), and Python backend via `olas-operate-middleware`.

The user will provide a functional requirement or bug description. Your job is to explore the codebase, understand the relevant code, and produce a **complete architectural plan with NO code implementation**.

**The plan must be complete enough for a developer or coding agent to implement without follow-up questions.** If the Unresolved Questions section has open items, the plan is not ready to hand off — resolve them first by reading more code or asking the user.

---

## Prerequisites — Before You Start

1. **If the feature has UI: designs must be available.** Design images, Figma links, or a filled Per-Screen Visual Spec (section 8) must exist. If not available, STOP and ask for them — do not plan UI without designs. Guessing layout, text, and component props causes the majority of implementation issues.
2. **If the feature has backend endpoints: their status must be clear.** Are they already built? Being built by the middleware team? In scope for this ticket? If unclear, ask before planning the frontend around an API that may not exist.

---

## Output Structure (required for every requirement)

### 1. Context
- Problem / user need
- What prompts this change
- Definition of done / success criteria

### 2. Scope Classification
- Type: **Bug** | **Feature** | **Refactor** | **Question**
- Scale: **Isolated** (1–2 files) | **Systemic** (cross-cutting)
- Backend: **Frontend-only** | **Requires middleware API change**

### 3. Data-Flow Trace
Trace the full path using Pearl's actual layer names:
- **Source**: user action / backend HTTP API / Electron store / on-chain RPC / GraphQL subgraph
- **Intermediate stops**: which provider(s) → which hook(s) → which component(s)
- **Sink**: UI render / Electron store write / API call / IPC event

### 4. File-Level Change List

| File path | Change | What & Why |
|---|---|---|
| `frontend/context/FooProvider.tsx` | modify | Add X because Y |
| `frontend/hooks/useFoo.ts` | new | Derive Z from provider context |
| `electron/store.js` | modify | Add new key with default + migration |

### 5. Backend / Middleware Requirements *(skip if frontend-only)*
> **BLOCKER — external middleware team must implement first.**
> Repo: https://github.com/valory-xyz/olas-operate-middleware

For each required change:
- Method + path
- Request body shape (JSON)
- Response shape (JSON)
- Error cases the frontend must handle
- Which frontend files are blocked until this lands

### 6. Electron IPC / Store Changes *(skip if not applicable)*
- New store keys → schema addition in `electron/store.js` with default value + migration if upgrading existing keys
- New IPC request-response → handler in `electron/main.js` + `ipcRenderer.invoke` in `electron/preload.js`
- New IPC fire-and-forget → `ipcRenderer.send` in `electron/preload.js` + `ipcMain.on` in `electron/main.js`
- **Store write path:** `useElectronApi()` → `store.set(key, value)` → IPC → `electron/main.js` → `electron-store`. `StoreProvider` is read-only (subscribes to `store-changed`, surfaces state). Never bypass IPC to write to the store from the renderer.

### 7. Implementation Approach
Lead with the single recommended approach. If alternatives exist, footnote only:
> Alt: [name] — [one-line pro] | [one-line con]

### 8. Per-Screen Visual Spec *(required for every new screen/component with a design)*

For each screen the feature adds or modifies, provide a machine-readable visual spec. **Do not describe — prescribe.** The coding agent cannot interpret Figma images reliably; it needs exact values.

Template per screen:
```
Screen: [name]
Wrapper: SetupCard / CardFlex / SCREEN_WITHOUT_CARDS with internal cards / none
Layout: single card / two stacked cards with gap

Title: level={3}, text="[exact text]"
Description: text="[exact text, word for word]"

[For each interactive element:]
Input: size=[default/small/large], placeholder="[exact]", prefix=[if any]
Button: type=[primary/default/link], size=[default/large], block=[yes/no], text="[exact]"
Alert: import from @/components/ui, type=[error/warning/info], message="[exact]", description="[exact]"
Modal: import from @/components/ui, size=[small/medium/large], closable=[yes/no]

[For each data display:]
List rows: [border style, padding, separator]
Tags/badges: [style, content format]

[Colors used:]
- [element]: COLOR.[constant name]
```

### 9. Phased Execution Order *(required for features touching 4+ files)*

Define the phases here so the coding agent knows what to build in what order. CLAUDE.md's "Workflow Commands" tells the coder to work in phases — this section defines those phases.

Each phase is a coherent unit (1 screen or 1 layer) within a single PR/branch. The PR is created after all phases are complete.

```
Phase 1: [scope — e.g., "Navigation entry points + tests"] (files: X, Y, Z, tests/X.test, tests/Y.test)
  → Run /review-implementation → wait for review

Phase 2: [scope — e.g., "Screen A + tests"] (files: A, B, tests/A.test)
  → Run /review-implementation → wait for review

Phase 3: [scope — e.g., "Screen B + tests"] (files: C, D, tests/C.test, tests/D.test)
  → Run /review-implementation → wait for review
```

Rules:
- Each phase builds on verified context from the previous phase
- Tests for a component are written in the same phase as the component, not deferred
- `yarn lint:frontend` and `yarn test:frontend -- --testPathPattern="<feature>"` must pass at the end of each phase
- **Never proceed to Phase N+1 with known issues in Phase N**

### 10. Hard Constraints Checklist
- [ ] No `eslint-disable` comments — fix the pattern instead
- [ ] No new top-level context providers unless strictly unavoidable (provider tree is already deep)
- [ ] Store writes use `useElectronApi()` → `store.set()` — never bypass IPC or write to electron-store directly from the renderer
- [ ] New visible UI behind a feature flag if required by reviewer (not all UI needs flags — ask if unsure)
- [ ] All timing/delay constants in relevant `constants.ts` — no inline numbers
- [ ] Middleware API changes flagged as blocker with full contract spec above
- [ ] New service template → update hash + `service_version` + run `scripts/js/check_service_templates.ts`
- [ ] New agent → add to `frontend/config/agents.ts` with `isAgentEnabled: true` and add store key in `electron/store.js`
- [ ] All components use custom wrappers from `@/components/ui` where available (Alert, Modal, SetupCard, etc.)
- [ ] All colors use `COLOR.*` constants from `@/constants` — no hardcoded hex values
- [ ] Run `/pre-implementation-check` before coding; run `/review-implementation` after each phase

### 11. Test Strategy

| Layer | Owns | Stub |
|---|---|---|
| Provider | Query wiring, polling, refetch, merge, store sync | `ServicesService`, `ethersMulticall`, Electron IPC |
| Hook | State derivation from provider context values | Provider context via `jest.mock` |
| Component | Rendering + user interaction | Hooks and providers |

For each new test file:
- Factories to reuse from `frontend/tests/helpers/factories.ts` (always check here first)
- New factories needed — if a payload shape appears in 2+ test files, promote to `factories.ts` before writing more tests
- Edge cases: loading state, error path, happy path, and race condition (where async or refs are involved)
- Follow phase order from `frontend/tests/TEST_PLAN.md` — don't write tests for phase N+1 before phase N dependencies exist
- **Write tests alongside components, not after all components are done** — deferred tests drift from the implementation

### 12. Unresolved Questions

| # | Question | Options | Blocks |
|---|---|---|---|
| 1 | [assumption that changes the plan if wrong] | A / B / C | [section] |

If none: *"None — plan is ready to implement."*

> **Gate:** Open questions in this section mean the plan is not ready to hand off. Resolve by reading more code or asking the user before finalising.

---

## Bug-Specific Additions *(same depth as features — append these sections)*

**Root Cause**
- Exact file + line number
- Why it manifests: race condition / stale ref / missing guard / type mismatch / incorrect assumption

**Reproduction Path**
- Steps to reproduce
- Expected vs actual behaviour

**Fix Options**
- Recommended fix with reasoning (why it's safe, what guard it adds)
- Alternatives footnoted

**Regression Risk**
- What else could break?
- Which existing tests provide guard coverage?

---

## Process Rules
1. **Explore first** — before writing any section, read all relevant source files: providers, hooks, components, store schema, config, constants. Never propose changes to code you haven't seen.
2. **Ask before assuming** — if the requirement is ambiguous or two approaches differ architecturally, surface the decision as a question with options before writing the plan.
3. **Reuse over invent** — check `frontend/components/ui/index.ts` for existing UI wrappers, `frontend/constants/colors.ts` for color constants, existing hooks/services/factories before proposing new ones. The plan must specify which existing components/constants to reuse.
4. **Flag middleware blockers early** — if anything requires a new API field, endpoint, or response change, call it out in section 5 immediately. Do not design frontend code around an API that doesn't exist without flagging it.
5. **No code** — output is a plan for a developer or coding agent to implement. No implementation, no diffs.
6. **Don't hand off incomplete plans** — if unresolved questions remain in section 12, resolve them before declaring the plan done.
7. **Prescribe, don't describe** — for UI components, specify exact: heading level, input size, button type/variant, wrapper component (`SetupCard`/`CardFlex`/none), `COLOR.*` constants to use. Don't say "a card with balances" — say "`SetupCard` containing `Flex vertical` with `ChainRow` styled-component (borderless, `padding: 12px 0`, `border-top: 1px solid COLOR.BORDER_LIGHT`)."
8. **Include verbatim copy** — every user-visible text string must be quoted exactly in the plan. Don't describe ("a description about recovery") — prescribe ("Enter the 12-word recovery phrase of the lost Pearl account to withdraw funds to an external wallet.")
