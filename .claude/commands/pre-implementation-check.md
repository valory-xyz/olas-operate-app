# Pre-Implementation Check

**MANDATORY before writing ANY frontend code.** CLAUDE.md requires this — see "Workflow Commands" section.

---

## Step 1: Review the UI component library

See **CLAUDE.md → "Component Imports — Use Custom Wrappers"** for the full table of custom wrappers and what they provide. For each wrapper you plan to use, read its source file in `frontend/components/ui/` to understand its props and styling — so you don't override it with inline styles or import the raw `antd` version.

Any component exported from `frontend/components/ui/index.ts` must be imported from `@/components/ui` — never directly from `antd`.

## Step 2: Review colors

Read `frontend/constants/colors.ts`. Map every color you'll need to a `COLOR.*` constant.

If a color doesn't exist in `COLOR`, add it to `colors.ts` first — don't hardcode hex values inline.

## Step 3: Review global SCSS

Read `frontend/styles/globals.scss`. Note utility classes available and custom Ant Design overrides. If a class handles styling, don't add inline styles on top.

## Step 4: Review existing hooks, services, and utils

Before creating new hooks, services, or utilities:
- Check `frontend/hooks/index.ts` — does a hook already exist for what you need?
- Check `frontend/service/` — does a service already wrap the API you're calling?
- Check `frontend/utils/` — does a formatter, validator, or helper already exist?
- Check `frontend/context/` — does a provider already expose the state you need?

Reuse over invent. If something similar exists, extend it rather than creating a duplicate.

## Step 5: Read the most similar existing screen

Find the closest existing screen to what you're building. Read it **completely**. Extract answers to:

1. **Card wrapping:** Does it use `SetupCard`? Is it in `SCREEN_WITHOUT_CARDS`? One card or two?
2. **Imports:** What comes from `@/components/ui` vs `antd`?
3. **Navigation:** Does it use `useSetup` + `goto(SETUP_SCREEN.X)`?
4. **Styled-components:** How are they defined?
5. **Inline styles:** What gets inline treatment vs className vs styled-component?

**Match this screen's patterns exactly.**

## Step 6: Review test helpers

Read `frontend/tests/helpers/factories.ts` and `frontend/tests/helpers/contextDefaults.ts`.
- List factories and context defaults you can reuse
- Check `frontend/tests/helpers/queryClient.ts` for `createTestQueryClient()` and `createQueryClientWrapper()`

Never create inline mock data if a factory exists for that shape.

## Step 7: Report findings — GATE

Before writing any code, output this report:

```
## Pre-Implementation Report

### UI Components
- Will use from @/components/ui: [list]
- Will import from antd (no wrapper exists): [list]

### Existing Code to Reuse
- Hooks: [list any existing hooks to reuse]
- Services: [list any existing services to reuse]
- Utils: [list any existing utils to reuse]
- Providers: [list any existing context to consume]

### Colors
- [list COLOR.* constants needed]

### Similar Screen Pattern
- Following: [screen name and file path]
- Card strategy: [SetupCard / CardFlex / SCREEN_WITHOUT_CARDS with internal cards / etc.]

### Test Factories
- Reusing: [list from factories.ts]
- Need new: [list]

### Potential Traps
- [anything unusual discovered during exploration]
```

**Do NOT proceed to coding until this report is acknowledged.**
