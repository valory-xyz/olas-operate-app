# Pre-Implementation Check

**MANDATORY before writing ANY frontend code.** CLAUDE.md requires this — see "Workflow Commands" section.

---

## Step 1: Read the UI component library

Read `frontend/components/ui/index.ts`. List every exported component.

For each one you plan to use, **read its source file** and note:
- What props it accepts (don't guess — read the type definition)
- What styling it provides via styled-components or CSS classes (so you don't override it with inline styles)
- What Ant Design component it wraps (so you **never** import the raw antd version)

Any component exported from this file must be imported from `@/components/ui` — never directly from `antd`.

## Step 2: Read the color constants

Read `frontend/constants/colors.ts`. Map every color you'll need to a `COLOR.*` constant.

If a color doesn't exist in `COLOR`, add it to `colors.ts` first — don't hardcode hex values inline.

## Step 3: Read the global SCSS

Read `frontend/styles/globals.scss`. Note:
- Utility classes available (spacing, typography, layout)
- Ant Design overrides (buttons, alerts, forms, inputs)
- Custom component classes (e.g., `.custom-alert--*`) — if a class handles styling, don't add inline styles on top

## Step 4: Read the most similar existing screen

Find the closest existing screen to what you're building. Read it **completely**. Extract answers to:

1. **Card wrapping:** Does it use `SetupCard`? Is it in `SCREEN_WITHOUT_CARDS`? Does it render one card or two?
2. **Imports:** What comes from `@/components/ui` vs `antd`?
3. **Navigation:** Does it use `useSetup` + `goto(SETUP_SCREEN.X)`?
4. **Styled-components:** How are they defined? Inline in the file? Separate styles file?
5. **Inline styles:** What gets inline treatment vs className vs styled-component?

**Match this screen's patterns exactly.**

## Step 5: Read test helpers

Read `frontend/tests/helpers/factories.ts` and `frontend/tests/helpers/contextDefaults.ts`.
- List factories you can reuse
- List context defaults you can reuse
- Check `frontend/tests/helpers/queryClient.ts` for `createTestQueryClient()` and `createQueryClientWrapper()`

Never create inline mock data if a factory exists for that shape.

## Step 6: Report findings — GATE

Before writing any code, output this report:

```
## Pre-Implementation Report

### UI Components
- Will use from @/components/ui: [list]
- Will import from antd (no wrapper exists): [list]

### Colors
- [list each COLOR.* constant needed and where]

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
