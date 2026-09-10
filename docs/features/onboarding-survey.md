# Onboarding Survey

## Overview

A one-time, two-step questionnaire shown once per Pearl account immediately after the user's
first agent success, plus a persistent sidebar alert for anyone who closes it without answering.
It exists to capture onboarding friction from the average user at the moment setup works — a
signal neither Zendesk (skews to bug reporters) nor Telegram (skews to power users) reaches.

One anonymous row per submission reaches a research spreadsheet via `pearl-api`. No wallet
address, `serviceConfigId` or account identifier is attached, by product requirement.

```
firstStakingRewardAchieved (RewardProvider)  ─┐
Home: view === 'profile'  (Connect only)     ─┴─► useOnboardingSurvey
                                                   ├── OnboardingSurvey  (modal, from MainPage)
                                                   ├── FeedbackAlert     (sidebar)
                                                   └── OnboardingSurveyService.submit → pearl-api
```

## Source of truth

- `frontend/hooks/useOnboardingSurvey.ts` — trigger, gating, expiry, timing classification, submission
- `frontend/components/OnboardingSurvey/constants.ts` — option ids and labels, 2-week window
- `frontend/components/OnboardingSurvey/index.tsx` — modal shell; owns step state and the selections
- `frontend/components/OnboardingSurvey/FeedbackAlert.tsx` — sidebar alert
- `frontend/service/OnboardingSurvey.ts` — the POST and its payload type
- `frontend/types/ElectronApi.ts` — `OnboardingSurveyState`, `OsInfo`, `ElectronStore.firstAppOpenedAt`
- `electron/store.js` — `firstAppOpenedAt` schema key, stamped once at first launch
- `electron/main.js` / `electron/preload.js` — the `os-info` IPC channel

## Release gate

There is no in-code switch. The feature is gated by not merging this branch until the pearl-api
endpoint ([autonolas-frontend-mono#449](https://github.com/valory-xyz/autonolas-frontend-mono/pull/449))
is deployed to production with its Google and Blob credentials in place. `useFeatureFlag` is not
used either: it is keyed per `AgentMap` entry, and this questionnaire is account-wide.

## Triggers

Both already existed; neither was built for this feature.

| Agent | Trigger | Where it comes from |
|---|---|---|
| Staking agents | `firstStakingRewardAchieved` | `RewardProvider` writes it the first time `isEpochTargetMet` turns true — the green "earned" line, **not** an on-chain reward transfer |
| Connect | First visit to the Profile tab | `Home` already sets `hasVisitedProfile` on `view === 'profile'` and reports it in |

Connect never stakes, so it has no reward signal; the Profile visit is its equivalent moment.
Every Connect user reaches it — `ConnectFirstRunModal` is non-dismissable and its CTA navigates
there.

## Gating — the survey state and nothing else

Only `storeState.onboardingSurvey` decides whether the survey shows or may be sent. The triggers
above *arm* it; they never gate it.

**`connect.firstRunCompleted` must never be used as the once-ever gate.** It is a
`Record<serviceConfigId, boolean>`, so it is per service — a second Connect instance completing
its first run would re-prompt a user who has already answered.

## Persistence

### `onboardingSurvey` (backend-bound, `.operate/pearl_store.json`)

| Field | Written when |
|---|---|
| `timingUnavailable` | Once, at the first hydration where it is undefined and services have fetched |
| `firstShownAt` | ISO timestamp of the first open. Its absence means "never shown" |
| `agentType` | Alongside `firstShownAt` — the agent whose success fired the trigger |
| `dismissed` | On close without submitting |
| `completed` | On any 2xx from pearl-api |

Backend-bound so it travels with `.operate`: "shown once, ever" is per account, so a user who
migrates machines must not be re-prompted. Grouped under one key rather than five top-level ones.

The `completed` write is durable — `pendingStoreWrites` queues backend-bound writes that fail
(typically because the Python backend is unreachable during shutdown) and replays them on the
next launch, so quitting immediately after submitting does not bring the feedback alert back.

### `firstAppOpenedAt` (Electron-native)

Deliberately **not** backend-bound. It records the very first launch, which happens before an
account — and so before `.operate/pearl_store.json` — exists. The cost is that it does not follow
the user to a new machine; the contract already carries a `null` path for exactly that gap.

Stamped once in `setupStoreIpc`, from the main process rather than the renderer, so it records
the launch and not the first React render.

## Behaviours worth not breaking

- **Auto-open happens once, in the session the trigger fires.** A persisted `firstShownAt` alone
  never reopens the modal on a later launch — only the feedback alert persists.
- **Existing users are handled by doing nothing special.** Someone whose
  `firstStakingRewardAchieved` was already true simply arms on the first launch after the update.
  Their timing is classified as unavailable (below) and reported as `null`.
- **Timing classification.** An account that already has a *deployed* service predates this
  feature, so its `firstAppOpenedAt` was stamped long after the user actually started — the elapsed
  time would be *wrong*, not merely missing, so it is sent as `null`. "Deployed" is decided with
  `isValidServiceId(chain_data.token)`: the middleware writes `token: -1` for a service that is
  created but not deployed, which is the state every new account is in when `Main` first mounts
  (`AgentOnboarding` creates the record before the user reaches `Main`), so a `!= null` check would
  call every new account pre-existing. The classification waits for `useServices().isFetched`
  **and** a defined list: `isFetched` is derived from `!isLoading`, which a query that never ran
  (offline at launch) also reports, and an unfetched list would misclassify a returning user as
  new.
- **Expiry is computed, not scheduled.** The 2-week window is derived by comparing now against
  `firstShownAt`; a timer would not survive a restart. Checked on open only, so a user who
  already has the modal open when the window lapses may still submit.
- **`timeToCompleteSurveySeconds` is measured from the persisted `firstShownAt`**, not from
  mount — otherwise a user who dismisses and returns days later via the feedback alert records seconds.
- **`agentType` comes from the value persisted at trigger time**, not the currently selected
  agent, so switching agents before submitting from the feedback alert still reports the right one.
- **No retry.** pearl-api does not dedupe, so a retry appends a second row. Any 2xx is treated as
  complete — including the server's internal fallback path, which is indistinguishable on the
  wire. Any non-2xx leaves the feedback alert in place.
- **`timeToFirstSuccessSeconds` is `number | null`, never coerced to `0`.**

## Shared session state

The modal (from `MainPage`), the sidebar alert and `Home`'s Connect trigger each mount their own
instance of the hook, so "is the modal open" and "has this session already armed" cannot live in
component state. They are held in the always-mounted query cache under
`onboardingSurveySession` — the same device `useConnectSession` uses for its launch-suppression
flag.

Consumers run their effects in the same commit, all closed over the same stale session value, so
the arm and classify paths read the session back from `queryClient.getQueryData` **inside** the
effect rather than from the render closure. Without that, two consumers arm at once.

## Contract

`POST {PEARL_API_URL}/api/feedback/onboarding-survey`, unauthenticated. Defined by
`valory-xyz/autonolas-frontend-mono` — see `apps/pearl-api/utils/feedback.ts` for the validator
this must satisfy. `200 { ok: true }` means accepted.

Field notes that are easy to get wrong: `rating` is numeric `1 | 2 | 3` (not a label), `os` has
four fields from Node's `os` module (not `{ platform, version }`), `agentType` is an `AgentMap`
id such as `polymarket_trader` (not a display name), and `submissionId` is a fresh
`crypto.randomUUID()` per attempt.

## Known gaps

- **`store.clear()` during account creation** would wipe `firstAppOpenedAt` on the very launch it
  was stamped. `electron/store.js` preserves that one key across the clear for this reason.
