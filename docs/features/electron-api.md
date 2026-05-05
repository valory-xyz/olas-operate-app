# Electron API & Persistent Store

## Overview

The frontend (React/Next.js) communicates with the Electron main process through IPC channels exposed via `contextBridge`. This is the foundation layer — almost every feature depends on it for notifications, logging, store persistence, tray control, and window management.

```
React Components
    ↓
useElectronApi() → ElectronApiProvider (React Context)
useStore()       → StoreProvider (React Context)
    ↓
window.electronAPI (contextBridge from preload.js)
    ↓  IPC channels
Electron Main Process
    ↓
electron-store, BrowserWindow, Tray, etc.
```

## Source of truth

- `electron/preload.js` — defines `window.electronAPI` via `contextBridge` (the actual IPC bindings)
- `frontend/context/ElectronApiProvider.tsx` — React context type (`ElectronApiContextProps`) and provider that wraps `window.electronAPI`
- `frontend/hooks/useElectronApi.ts` — hook to consume the Electron API context
- `electron/store.js` — Electron store schema, defaults, IPC handlers, and change broadcasting
- `frontend/context/StoreProvider.tsx` — reactive store wrapper
- `frontend/hooks/useStore.ts` — hook to consume store state

## Contract / schema

### Electron API

The context type `ElectronApiContextProps` (in `ElectronApiProvider.tsx`) defines every method the frontend expects. All properties are optional (`?`) at the type level, but the provider resolves each one from `window.electronAPI` at render time and throws if any is missing.

Two IPC patterns are used:
- `send` — fire-and-forget, no response (e.g., `ipcRenderer.send`)
- `invoke` — request-response, returns a Promise (e.g., `store.get`, `saveLogs`)

`ipcRenderer` is also exposed for custom channels (e.g., `store-changed` listener in `StoreProvider`).

### Persistent Store

The store schema (keys, types, defaults, per-agent settings) is defined in `electron/store.js`. The frontend accesses it through two layers:

**Layer 1 — Direct store operations** (via `ElectronApiProvider`):

Access via `useElectronApi().store` — provides `store()` (full snapshot), `get(key)`, `set(key, value)`, `delete(key)`, `clear()`. All are Promise-based, each invoking an IPC handler (`store-get`, `store-set`, `store-delete`, `store-clear`) on the main process.

**Layer 2 — Reactive store state** (via `StoreProvider`):

1. **On mount:** Calls `store.store()` to fetch the initial snapshot into React state
2. **Live sync:** Registers an `ipcRenderer.on('store-changed', ...)` listener
3. **When main process updates store:** `electron-store` fires `onDidAnyChange`, which broadcasts `store-changed` to the renderer via `webContents.send()`
4. `StoreProvider` receives the event and calls `setStoreState(data)` — React re-renders

## Runtime behavior

### ElectronApiProvider

On render, the provider calls `getElectronApiFunction(name)` for **every** method in its value object. This function:
1. Returns `undefined` during SSR (`typeof window === 'undefined'`)
2. Uses `lodash.get` to resolve `window.electronAPI.{name}` (supports dot paths like `store.get`, `ipcRenderer.send`)
3. Throws if the resolved value is falsy or not a function

The context default value (used when no provider is mounted) contains no-op stubs for every method, so consumers outside the provider tree get silent no-ops rather than crashes.

### Store change flow

```
Component calls store.set('lastSelectedAgentType', 'modius')
  → IPC invoke 'store-set'
  → electron-store writes to disk
  → onDidAnyChange fires
  → webContents.send('store-changed', newStoreData)
  → StoreProvider's ipcRenderer.on('store-changed') fires
  → setStoreState(newStoreData)
  → Components re-render with new storeState
```

Any store change (even from another window) is automatically reflected in React.

### StoreProvider initialization

`StoreProvider` only calls `setupStore()` if `storeState` is currently `undefined`. This means the initial fetch and listener registration happen exactly once. The `store-changed` listener persists for the lifetime of the component — there is no cleanup/unsubscribe in `useEffect`.

## Failure / guard behavior

| Condition | Behavior |
|---|---|
| SSR (`typeof window === 'undefined'`) | `getElectronApiFunction` returns `undefined` — all context values are `undefined` |
| `window.electronAPI` is missing entirely | Throws `"Function {name} not found in window.electronAPI"` for the first method resolved |
| `window.electronAPI` is partial (e.g., has `closeApp` but not `saveLogs`) | Throws for every missing method — a partial mock is not enough |
| A property exists on `window.electronAPI` but is not a function | Throws `"Function {name} not found in window.electronAPI"` |
| `store.store()` rejects during `StoreProvider` mount | Caught by `.catch(console.error)` — `storeState` remains `undefined` |
| No `ElectronApiProvider` in tree | Consumers get the context default (no-op stubs), not `undefined` |

## Test-relevant notes

- **Mocking `window.electronAPI`:** Tests for `ElectronApiProvider` must provide a **complete** `window.electronAPI` object with every method the provider resolves. Missing any single method will throw. See the provider's value object in `ElectronApiProvider.tsx` for the full list of dot-paths resolved.
- **Mocking for consumers:** Tests for hooks/components that call `useElectronApi()` should mock `ElectronApiProvider` or the context directly — they don't need a real `window.electronAPI`.
- **StoreProvider** depends on `ElectronApiContext` directly (not via the hook) — it calls `useContext(ElectronApiContext)`.
- **No listener cleanup:** `StoreProvider` registers an `ipcRenderer.on` listener but never removes it. In tests, this means the listener persists until the component unmounts.
- **Used by:** Almost everything — notifications, tray icon, store persistence, logging, support, window management. Refer to `ElectronApiProvider.tsx` for the full consumer list.
