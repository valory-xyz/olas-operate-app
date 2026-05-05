# Agent Settings

## Overview

The agent settings system lets users update agent-specific environment variables (API keys, configuration) and handles automatic service restarts after changes. Each agent type has its own update form with type-specific fields.

```
UpdateAgentPage (routes to per-agent forms)
  ├── PredictUpdateForm
  ├── AgentsFunUpdateForm
  ├── ModiusUpdateForm
  └── OptimusUpdateForm
        └── useConfirmUpdateModal (save + fire-and-forget restart)
              ├── ServicesService.updateService
              ├── ServicesService.stopDeployment
              └── ServicesService.startService
```

## Source of truth

- `frontend/components/UpdateAgentPage/index.tsx` — agent settings update page (routes to per-agent forms)
- `frontend/components/UpdateAgentPage/hooks/useConfirmModal.ts` — update confirmation + fire-and-forget restart
- `frontend/components/UpdateAgentPage/context/UpdateAgentProvider.tsx` — update page context

## Runtime behavior

### Updating agent settings (`UpdateAgentPage` + `useConfirmUpdateModal`)

The update flow lets users change agent-specific environment variables (API keys, configuration). Each agent type has its own update form (PredictUpdateForm, AgentsFunUpdateForm, ModiusUpdateForm, OptimusUpdateForm). The `x402`-enabled agents throw an error — updates are not supported for them.

`useConfirmUpdateModal` orchestrates the update + optional restart:

```
confirm()
  ├── confirmCallback()  (saves new env vars via ServicesService.updateService)
  ├── On success:
  │     ├── Show 'Agent settings updated successfully'
  │     └── restartIfServiceRunning() (fire-and-forget, not awaited)
  │           ├── ServicesService.stopDeployment(serviceConfigId)
  │           └── ServicesService.startService(serviceConfigId)
  ├── On error: re-throw (caller handles)
  └── Close modal (only on success)
```

The restart is fire-and-forget — it runs in the background after the modal closes. If the service isn't running, no restart occurs. Restart errors show a toast but don't throw.

## Failure / guard behavior

- **UpdateAgentPage** — throws `Error` if `selectedAgentConfig.isX402Enabled` is true (updates not supported for x402 agents).
- **useConfirmUpdateModal restart** — fire-and-forget: runs `stop → start` in background. Restart errors show a toast (`'Failed to restart service.'`) but don't propagate. If service isn't running, restart is skipped entirely.

## Test-relevant notes

- `useConfirmUpdateModal` — test the fire-and-forget restart: verify `stopDeployment` + `startService` are called when service is running, and skipped when not. Test that restart errors show toast but don't throw. Test that modal closes only on success.
- `UpdateAgentPage` — test that it throws for x402-enabled agents. Test that it renders the correct form for each agent type.
