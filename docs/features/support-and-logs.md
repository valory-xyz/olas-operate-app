# Support & Logs

## Overview

Pearl has a built-in support ticket system and log export feature. Users can submit support tickets (with optional log attachments and file uploads) directly from the app, or export logs to disk for manual sharing. Logs aggregate debug data from multiple sources — wallets, balances, services, and the Electron store — into a single payload.

## Source of truth

- `frontend/service/Support.ts` — API client for file uploads and ticket creation (Zendesk via proxy)
- `frontend/hooks/useLogs.ts` — main log aggregation hook (combines addresses, balances, services, store)
- `frontend/components/SupportModal/useFallbackLogs.ts` — fallback log hook for ErrorBoundary (fetches via API, not context)
- `frontend/components/SupportModal/useUploadSupportFiles.ts` — file upload orchestration (logs + user attachments)
- `frontend/components/SupportModal/utils.ts` — `formatAttachments` (FileReader → base64) and `formatFileSize`
- `frontend/components/SupportModal/SupportModal.tsx` — form UI + submission flow
- `frontend/components/ExportLogsButton.tsx` — export-to-disk button
- `frontend/context/SupportModalProvider.tsx` — modal open/close state
- `frontend/constants/urls.ts` — `SUPPORT_API_URL` (`PEARL_API_URL/api/zendesk`)

## Contract / schema

### Support API (`SupportService`)

Two endpoints, both `POST` with JSON body:

**`/upload-file`** — uploads a single file, returns a token for attaching to a ticket.
- Request: `{ fileName, fileData, contentType }` (fileData is base64 data URL)
- Response: `{ upload: { token } }` on success
- Return type: `{ success: true, token }` or `{ success: false, error }`

**`/create-ticket`** — creates a Zendesk support ticket.
- Request: `{ email?, subject, description, uploadTokens?, tags? }`
- Response: `{ ticket: { id } }` on success
- Return type: `{ success: true, ticketId }` or `{ success: false, error }`

`tags` is optional at the service client level — `SupportService.createTicket` passes whatever is provided. The `SupportModal` component hardcodes `['pearl', 'support']` when calling the service.

### Main log payload (`useLogs`)

Defined in `frontend/hooks/useLogs.ts`. Returns `{ store, debugData }` where `debugData` has sections for `services`, `addresses`, and `balances`. Each section is `null` until its source `isLoaded` flag is `true`. When loaded, missing values are serialized as the **string** `'undefined'` (not actual `undefined` or empty arrays) — e.g., `{ masterEoa: 'undefined' }` when no EOA exists.

### Fallback log payload (`useFallbackLogs`)

Defined in `frontend/components/SupportModal/useFallbackLogs.ts`. Different shape — no `store` key, uses `wallets` and `balances` as empty arrays. Used inside `ErrorBoundary` where context providers are unavailable. Fetches services directly via `ServicesService.getServices()` with React Query (retry: 1, staleTime: 30s). Uses the same query keys as `ServicesProvider` to leverage cache.

## Runtime behavior

### Log aggregation (`useLogs`)

Three internal hooks feed into the final payload:

1. **`useAddressesLogs`** — reads master EOA, master safes, and derives backup EOAs by filtering multisig owners to exclude the master EOA address. Depends on `useMasterWalletContext` and `useMultisigs`.

2. **`useBalancesLogs`** — reads wallet balances and totals from `useBalanceContext`. Depends on `useMasterWalletContext` for master wallets.

3. **`useServicesLogs`** — reads services from `useServices`, maps key objects to just addresses, and merges `selectedService.deploymentStatus` into matching service entries.

All three return `{ isLoaded, data }`. The final `useLogs` combines them, substituting `null` for any section not yet loaded.

### Support ticket submission flow

```
User fills form → Submit
  → uploadFiles(userAttachments, shouldShareLogs)
    → formatAttachments(files)           // FileReader → base64
    → loadLogsFile() if shouldShareLogs  // saveLogsForSupport (Electron) → readFile → FileDetails
    → uploadFile(file) for each          // SupportService.uploadFile → token
  → SupportService.createTicket({ email, subject, description, uploadTokens, tags })
  → success: show ticketId | failure: show error modal
  → cleanupSupportLogs()                 // always, even on failure
```

### Log export flow (`ExportLogsButton`)

```
User clicks "Export logs"
  → setCanSaveLogs(true)
  → useEffect fires (guards: !isLoading, has logs, canSaveLogs)
  → saveLogs(logs) via Electron API
    → success: toast with "Open folder" link (openPath)
    → failure: toast with error
  → reset isLoading and canSaveLogs
```

The button uses a two-step pattern: `onClick` sets a flag, then `useEffect` performs the async work. This ensures logs are current at the time of save (the `logs` object from `useLogs` is a dependency of the effect).

## Failure / guard behavior

| Condition | Behavior |
|---|---|
| `saveLogsForSupport` or `readFile` is undefined (test/mock only — in production `ElectronApiProvider` throws if these are missing) | `loadLogsFile` returns `null` — logs are skipped, user attachments still upload |
| `saveLogsForSupport` returns `{ success: false }` | `message.error('Failed to save logs')`, returns `null` |
| `readFile` returns `{ success: false }` | `message.error(error)`, returns `null` |
| `SupportService.uploadFile` fails (network or non-ok response) | Returns `{ success: false, error }`, filtered out of upload tokens via `compact` |
| `SupportService.createTicket` fails | Caught, sets `isError: true`, shows error modal with Discord link |
| All uploads fail but ticket creation succeeds | Ticket created without attachments (empty `uploadTokens` array) |
| `useLogs` dependencies not yet loaded | `debugData` sections are `null` — logs are partial but still saveable |
| `saveLogs` (export) returns `{ success: false }` | Toast: "Save logs failed or cancelled" |
| `useFallbackLogs` — services fetch fails | React Query retries once, then `isServicesFetched: true` with `undefined` services |

## Test-relevant notes

- **`SupportService`** is a pure API client — test by mocking `fetch`. Two endpoints, discriminated union return types. `parseApiError` is used for non-ok responses (shared util from `utils/error.ts`).
- **`useLogs`** depends on 4 context hooks (`useMasterWalletContext`, `useMultisigs`, `useBalanceContext`, `useServices`) plus `useStore`. All need mocking. Test that sections are `null` when not loaded and populated when loaded.
- **`useUploadSupportFiles`** orchestrates `saveLogsForSupport` (Electron), `readFile` (Electron), and `SupportService.uploadFile`. Test the three failure points independently. The `shouldUseFallbackLogs` flag switches between `useLogs` and `useFallbackLogs`.
- **`formatAttachments`** uses `FileReader.readAsDataURL` — needs jsdom `FileReader` or a mock. Returns `compact`ed results (null entries filtered).
- **`ExportLogsButton`** uses a flag-then-effect pattern — test that clicking sets the flag, then the effect calls `saveLogs`. The loading state covers both `isLoading` and `canSaveLogs`.
- **`SupportModalProvider`** is trivial — a `useToggle` wrapper. Renders `SupportModal` as a child.
- **`cleanupSupportLogs`** is always called in `finally` — even when ticket creation fails.
