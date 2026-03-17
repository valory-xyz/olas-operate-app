# Achievements

## Overview

The achievement system tracks and displays agent accomplishments — like winning predictions or completing payouts. It polls for new achievements, schedules their display in a modal, acknowledges them on the backend, and triggers server-side image generation for social sharing.

```
AchievementService (API client)
  ├── getServiceAchievements → useAchievements (polling)
  ├── acknowledgeServiceAchievement → useTriggerAchievementBackgroundTasks
  └── generateAchievementImage → useTriggerAchievementBackgroundTasks

useAchievements (5-min polling)
  └── useCurrentAchievement (display scheduling)
        └── AchievementModal (UI + background tasks)
```

## Source of truth

- `frontend/service/Achievement.ts` — achievement API client (`getServiceAchievements`, `acknowledgeServiceAchievement`, `generateAchievementImage`)
- `frontend/types/Achievement.ts` — `Achievement`, `ServiceAchievements`, `AchievementWithConfig`
- `frontend/constants/achievement.ts` — `ACHIEVEMENT_AGENT`, `ACHIEVEMENT_TYPE`
- `frontend/components/AchievementModal/hooks/useAchievements.ts` — achievement polling (5-minute interval)
- `frontend/components/AchievementModal/hooks/useCurrentAchievement.ts` — display scheduling (1-minute delay between achievements)
- `frontend/components/AchievementModal/hooks/useTriggerAchievementBackgroundTasks.ts` — acknowledge + image generation (3 retries)
- `frontend/components/AchievementModal/index.tsx` — modal component (triggers background tasks, marks shown on close)
- `frontend/components/AchievementModal/utils.ts` — achievement URL and X share intent generation

## Contract / schema

### Achievement API (`AchievementService`)

Three endpoints across two backends:

**`GET /api/v2/service/{id}/achievements`** (middleware) — fetches unacknowledged achievements for a service.

```json
[
  {
    "achievement_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "acknowledged": false,
    "acknowledgement_timestamp": 0,
    "achievement_type": "polystrat/payout",
    "title": "Won a prediction",
    "description": "Your agent correctly predicted an outcome",
    "timestamp": 1773054164,
    "data": {
      "id": "0x1234...abcd",
      "prediction_side": "Yes",
      "bet_amount": 5.0,
      "status": "won",
      "net_profit": 3.75,
      "total_payout": 8.75,
      "created_at": "2025-01-15T10:30:00Z",
      "settled_at": "2025-01-16T14:00:00Z",
      "transaction_hash": "0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
      "market": {
        "id": "0x5678...ef01",
        "title": "Will ETH reach $5000 by March 2025?",
        "external_url": "https://polymarket.com/event/eth-5000-march-2025"
      }
    }
  }
]
```

Accepts `AbortSignal`. Throws `Error` with service config ID in message on failure.

**`POST /api/v2/service/{id}/achievement/{achievementId}/acknowledge`** (middleware) — marks an achievement as seen.

No request body. Throws `Error` on non-ok response.

**`POST /api/achievement/generate-image?agent={agent}&type={type}&id={id}`** (Pearl API at `pearl-api.olas.network`) — triggers server-side achievement image generation.

Query params: `agent` and `type` are derived by splitting `achievement_type` on `"/"` (e.g., `"polystrat/payout"` → `agent="polystrat"`, `type="payout"`). `id` is **not** the `achievement_id` — it's a type-specific data ID extracted via `getAchievementDataIdFromType()`. For Polystrat payouts, this is `achievement.data.id` (the bet ID). If the data ID can't be resolved (unknown achievement type), background tasks are skipped. Throws `Error` on non-ok response.

## Runtime behavior

### Achievement display lifecycle

1. **Polling**: `useAchievements` fetches achievements every 5 minutes via `getServiceAchievements`. Only enabled when a service is running.

2. **Scheduling**: `useCurrentAchievement` picks the next unshown achievement, with a 1-minute delay between displays. Tracks shown achievement IDs to avoid repeats within a session.

3. **Background tasks**: When an achievement is displayed, `useTriggerAchievementBackgroundTasks` runs in parallel:
   - `acknowledgeServiceAchievement` — marks it as seen in the backend
   - `generateAchievementImage` — triggers server-side image generation for sharing
   - Both retry up to 3 times on failure

4. **Sharing**: The Polystrat payout modal shows a "Share on X" button that opens a tweet intent with the achievement URL. The button is only enabled after the predict website has been "warmed up" (prefetched).

## Failure / guard behavior

- **AchievementService** — all three methods throw `Error` on non-ok responses. `getServiceAchievements` accepts `AbortSignal`; `acknowledgeServiceAchievement` and `generateAchievementImage` do not.
- **Achievement polling** — `useAchievements` only queries when a service is actively running. If the service stops, polling stops.
- **Achievement background tasks** — retry up to 3 times. Failures after 3 retries are silently absorbed (no user-facing error).

## Test-relevant notes

- `AchievementService` — mock `fetch` for all three methods. Test URL construction for `generateAchievementImage` (query params). Test that `getServiceAchievements` passes `signal` and the others don't.
- `useAchievements` — test that polling is disabled when no service is running. Test 5-minute interval.
- `useCurrentAchievement` — test that it tracks shown IDs and enforces the 1-minute delay between displays.
- `useTriggerAchievementBackgroundTasks` — test the 3-retry behavior and that both acknowledge + image generation run in parallel.
- `useTriggerAchievementBackgroundTasks` — test that `generateAchievementImage` receives `achievement.data.id` (not `achievement_id`). Test that unknown achievement types (where `getAchievementDataIdFromType` returns null) skip background tasks and set `areBackgroundTasksFinalized = true`.
