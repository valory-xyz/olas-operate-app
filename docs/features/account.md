# Account

## Overview

Account management handles user identity: creating a password-protected local account, logging in, changing passwords, and recovering access when keys are lost. The account is the root of the wallet hierarchy — creating an account derives the mnemonic from which all wallets are generated.

```
Account (password-protected)
  └── Master EOA (derived from mnemonic)
        └── Master Safes (one per chain)
              └── Agent Wallets (per service)
```

## Source of truth

- `frontend/service/Account.ts` — account create, login, password update
- `frontend/service/Recovery.ts` — recovery status, preparation, completion
- `frontend/context/SetupProvider.tsx` — setup wizard state (current screen + backup signer)
- `frontend/hooks/useSetup.ts` — setup navigation + backup signer persistence to Electron store
- `frontend/hooks/useValidatePassword.ts` — password validation via login attempt
- `frontend/hooks/useMnemonicExists.ts` — mnemonic existence flag (Electron store)
- `frontend/hooks/useRecoveryPhraseBackup.ts` — recovery phrase backup flag (Electron store)
- `frontend/hooks/useBackupSigner.ts` — resolves backup signer address (setup context → on-chain fallback; also documented in `wallet.md`)
- `frontend/types/Recovery.ts` — recovery types (`RecoveryStatus`, `ExtendedWallet`, `RecoveryPrepareProcess`, etc.)

## Contract / schema

### Account API (`AccountService`)

Methods: `getAccount`, `createAccount`, `updateAccount`, `loginAccount`. See [middleware API docs](https://github.com/valory-xyz/olas-operate-middleware/blob/main/docs/api.md) for endpoint details.

All use `CONTENT_TYPE_JSON_UTF8` headers. Non-ok responses throw via `parseApiError` (except `getAccount` which throws a generic error). `parseApiError` parses the response body as JSON and reads `error` or `message` (preferring `error`), falling back to its `fallbackMessage` argument if neither is present or if JSON parsing fails. Backend typically returns `{ "error": "..." }` with HTTP 400/401/404/409.

Example: `getAccount` response:
```json
{ "is_setup": true }
```

Example: `createAccount` with password too short (HTTP 400):
```json
{ "error": "Password must be at least 8 characters long" }
```

Example: `createAccount` when account already exists (HTTP 409):
```json
{ "error": "Account already exists" }
```

Example: `loginAccount` success (HTTP 200):
```json
{ "message": "Login successful" }
```

Example: `loginAccount` invalid password (HTTP 401):
```json
{ "error": "Invalid password" }
```

Example: `loginAccount` no account (HTTP 404):
```json
{ "error": "Account not found" }
```

Example: `updateAccount` request:
```json
{ "old_password": "currentpass", "new_password": "newpass123" }
```

### Recovery API (`RecoveryService`)

Methods: `getRecoveryStatus`, `getExtendedWallet`, `getRecoveryFundingRequirements`, `prepareRecovery`, `completeRecovery`. See [middleware API docs](https://github.com/valory-xyz/olas-operate-middleware/blob/main/docs/api.md) for endpoint details.

All accept optional `AbortSignal`. The backend response for `getRecoveryStatus` includes additional fields (`num_safes`, `num_safes_with_new_wallet`, `num_safes_with_old_wallet`, etc.) that the frontend does not type or consume.

Example: `getRecoveryStatus` response (only fields used by frontend `RecoveryStatus` type):
```json
{
  "prepared": true,
  "bundle_id": "recovery_bundle_7f3a2b",
  "has_swaps": false,
  "has_pending_swaps": true
}
```

Example: `prepareRecovery` request/response:

Request:
```json
{ "new_password": "newpass123" }
```

Response:
```json
{
  "id": "recovery_bundle_7f3a2b",
  "wallets": [{
    "current_wallet": {
      "address": "0xC581D42746dfBf60E9F1beA5BeeF2ED4619CCfEE",
      "safes": { "gnosis": "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C" },
      "safe_chains": ["gnosis"],
      "ledger_type": "ethereum",
      "safe_nonce": 8778523976991075659331170829352821736443506761734954639667311334066645078123
    },
    "new_wallet": {
      "address": "0x7A1b537d2F56bBaE9e57Ca04bC0E2BFd2E176C2a",
      "safes": { "gnosis": "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C" },
      "safe_chains": ["gnosis"],
      "ledger_type": "ethereum",
      "safe_nonce": 8778523976991075659331170829352821736443506761734954639667311334066645078123
    },
    "new_mnemonic": ["creek", "salute", "fury", "panel", "invest", "mixture", "filter", "bright", "smooth", "avocado", "grain", "exhibit"]
  }]
}
```

Example: `getRecoveryFundingRequirements` response:
```json
{
  "balances": {
    "gnosis": { "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C": { "0x0000000000000000000000000000000000000000": "1000000000000000000" } }
  },
  "total_requirements": {
    "gnosis": { "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C": { "0x0000000000000000000000000000000000000000": "500000000000000000" } }
  },
  "refill_requirements": {
    "gnosis": { "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C": { "0x0000000000000000000000000000000000000000": "0" } }
  },
  "is_refill_required": false,
  "pending_backup_owner_swaps": { "gnosis": [] }
}
```

Example: `getExtendedWallet` response:
```json
[{
  "address": "0xC581D42746dfBf60E9F1beA5BeeF2ED4619CCfEE",
  "safes": {
    "gnosis": {
      "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C": {
        "backup_owners": ["0x2455556c4bd75975ccFa293B87476Fb0d6CB5524"],
        "balances": { "0x0000000000000000000000000000000000000000": "1000000000000000000" }
      }
    }
  },
  "safe_chains": ["gnosis"],
  "ledger_type": "ethereum",
  "safe_nonce": 8778523976991075659331170829352821736443506761734954639667311334066645078123,
  "balances": {
    "gnosis": { "0xE97C17124cd1CD95300E2bE3e207C4B8162A535C": { "0x0000000000000000000000000000000000000000": "1000000000000000000" } }
  },
  "extended_json": true,
  "consistent_safe_address": true,
  "consistent_backup_owner": true,
  "consistent_backup_owner_count": true
}]
```

### Recovery types

Defined in `frontend/types/Recovery.ts`: `RecoveryStatus`, `RecoveryPrepareProcess`, `RecoveryFundingRequirements`. Key field: `has_swaps` on `RecoveryStatus` — when true, login is blocked until recovery is completed.

### Setup state

Defined as `SetupObjectType` in `frontend/context/SetupProvider.tsx`. Tracks current screen, previous screen (for back navigation), and optional backup signer.

Initial state: `{ state: SETUP_SCREEN.Welcome, prevState: null, backupSigner: undefined }`.

## Runtime behavior

### Setup flow (`useSetup`)

- `goto(screen)` — updates setup state, preserving previous screen for back navigation
- `setBackupSigner({ address, type })` — persists to Electron store as `lastProvidedBackupWallet`
- **Sync effect:** On mount and when `storeState.lastProvidedBackupWallet` changes, syncs the stored value back into `setupObject.backupSigner`. Uses `Object.assign` (mutates in place, React won't necessarily re-render from this alone).

### Password validation (`useValidatePassword`)

Validates by attempting `AccountService.loginAccount(password)`. Returns `true` on success, `false` on any error. Uses React Query `useMutation` for loading/success/error states.

### Mnemonic existence flag (`useMnemonicExists`)

Reads `storeState.mnemonicExists` from Electron store. Exposes `setMnemonicExists(exists: boolean)` — a general-purpose setter that can write `true` or `false`.

### Recovery phrase backup flag (`useRecoveryPhraseBackup`)

Reads `storeState.recoveryPhraseBackedUp` from Electron store, coerced to boolean via `!!`. Exposes `markAsBackedUp()` — a one-way setter that only writes `true` and only when `isBackedUp` is currently `false`. There is no way to unmark the backup through this hook.

## Failure / guard behavior

| Condition | Behavior |
|---|---|
| `getAccount` returns non-ok | Throws `"Failed to get account"` |
| `createAccount` / `updateAccount` / `loginAccount` returns non-ok | `parseApiError` extracts error message from response body and throws |
| Recovery endpoints return non-ok | Each throws its own descriptive error string (e.g., `"Failed to fetch recovery status"`) |
| `has_swaps` is `true` in recovery status | Login blocked until recovery is completed — enforced by `SharedProvider` (fetches recovery status) and `SetupWelcome` (redirects to recovery flow), not by `RecoveryService` itself |

## Test-relevant notes

- **`AccountService`** and **`RecoveryService`** are pure API clients — test by mocking `fetch`. Account service uses `parseApiError` for non-ok responses (except `getAccount`). Recovery service throws generic errors.
- **`useSetup`** sync effect uses `Object.assign` to mutate `prev` — this is an intentional pattern (mutate-in-place avoids a re-render cycle), but means the `setSetupObject` callback doesn't create a new reference.
- **`useValidatePassword`** wraps `loginAccount` in a mutation — test the `true`/`false` return, not the mutation internals.
- **`SetupProvider`** is trivial — just `useState` with initial values. No logic to test beyond state setting.
- **Electron store keys used:** `mnemonicExists`, `recoveryPhraseBackedUp`, `lastProvidedBackupWallet` (object with `address` and `type`).
