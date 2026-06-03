import { AGENT_CONFIG } from '@/config/agents';
import { AgentType } from '@/constants/agent';

/**
 * Invert AGENT_CONFIG's `agentIds` → display name. Agent ids are canonical
 * on-chain ids (e.g. Gnosis 14 / 25 = Predict Trader), so this resolves an
 * agent's name for ANY service straight from subgraph data, without needing
 * the service to be loaded locally (which the multisig-based
 * useAgentLookupBySafe requires).
 */
const DISPLAY_NAME_BY_AGENT_ID: Map<number, string> = (() => {
  const map = new Map<number, string>();
  (Object.keys(AGENT_CONFIG) as AgentType[]).forEach((key) => {
    const config = AGENT_CONFIG[key];
    (config.agentIds ?? []).forEach((id) => {
      if (!map.has(id)) map.set(id, config.displayName);
    });
  });
  return map;
})();

export const agentDisplayNameByAgentIds = (
  agentIds: number[] | null | undefined,
): string | null => {
  if (!agentIds) return null;
  for (const id of agentIds) {
    const name = DISPLAY_NAME_BY_AGENT_ID.get(id);
    if (name) return name;
  }
  return null;
};
