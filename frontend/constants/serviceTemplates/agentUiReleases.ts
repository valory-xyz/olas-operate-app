import { AgentMap, AgentType } from '@/constants';

/**
 * Release of the agent's web UI (the interface Pearl embeds via iframe).
 *
 * Most of these UIs live in the `agent-ui-monorepo` repository, which publishes
 * a separate tagged release per agent (e.g. `v0.1.20-omenstrat-trader`). PettAi
 * is the exception — its UI ships inside the agent's own `pettai-agent` repo, so
 * its UI release tracks that repository instead.
 *
 * There is no backend/middleware source for these versions (Pearl only embeds
 * the UI at runtime), so they are tracked here as a frontend-only constant and
 * bumped manually alongside `service_version` / `agent_release` when an agent's
 * UI is updated. Surfaced on the Release Notes page (OPE-1709).
 */
export type AgentUiRelease = {
  /** GitHub repository owner. */
  owner: string;
  /** GitHub repository name. */
  name: string;
  /** GitHub release tag (used both for display and the release URL). */
  version: string;
};

const AGENT_UI_MONOREPO = 'agent-ui-monorepo';

export const AGENT_UI_RELEASES: Partial<Record<AgentType, AgentUiRelease>> = {
  [AgentMap.PredictTrader]: {
    owner: 'valory-xyz',
    name: AGENT_UI_MONOREPO,
    version: 'v0.1.20-omenstrat-trader',
  },
  [AgentMap.Polystrat]: {
    owner: 'valory-xyz',
    name: AGENT_UI_MONOREPO,
    version: 'v0.1.16-polystrat-trader',
  },
  [AgentMap.Modius]: {
    owner: 'valory-xyz',
    name: AGENT_UI_MONOREPO,
    version: 'v0.1.8-modius',
  },
  [AgentMap.Optimus]: {
    owner: 'valory-xyz',
    name: AGENT_UI_MONOREPO,
    version: 'v0.1.9-optimus',
  },
  [AgentMap.Basius]: {
    owner: 'valory-xyz',
    name: AGENT_UI_MONOREPO,
    // TODO(basius): replace with Basius-specific release tag (e.g. v0.1.X-basius)
    // once the agent-ui-monorepo PR adding basius support is merged and a tag
    // is cut. Currently falls back to Optimus's tag — works because Basius
    // shares the same babydegen-ui app, but the Release Notes page (OPE-1709)
    // will incorrectly show 'v0.1.9-optimus' under Basius until fixed.
    version: 'v0.1.9-optimus',
  },
  [AgentMap.AgentsFun]: {
    owner: 'valory-xyz',
    name: AGENT_UI_MONOREPO,
    version: 'v0.1.2-agentsfun',
  },
  [AgentMap.PettAi]: {
    owner: 'valory-xyz',
    name: 'pettai-agent',
    version: 'v0.1.11',
  },
};
