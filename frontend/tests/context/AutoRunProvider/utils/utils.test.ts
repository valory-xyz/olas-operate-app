import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap, AgentType } from '../../../../constants/agent';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { IncludedAgent } from '../../../../context/AutoRunProvider/types';
import {
  appendNewAgents,
  getAgentDisplayName,
  getAgentFromService,
  getDecommissionedAgentTypes,
  getEligibleAgentTypes,
  getExcludedAgentTypes,
  getOrderedIncludedAgentTypes,
  normalizeIncludedAgents,
  notifySkipped,
  notifyStartFailed,
  sortIncludedAgents,
} from '../../../../context/AutoRunProvider/utils/utils';
import { makeAutoRunAgentMeta, makeService } from '../../../helpers/factories';

describe('notifySkipped', () => {
  it('calls showNotification with agent name and reason', () => {
    const showNotification = jest.fn();
    notifySkipped(showNotification, 'Omenstrat', 'Low balance');
    expect(showNotification).toHaveBeenCalledWith(
      'Agent Omenstrat was skipped',
      'Low balance',
    );
  });

  it('calls showNotification without reason when undefined', () => {
    const showNotification = jest.fn();
    notifySkipped(showNotification, 'Polystrat');
    expect(showNotification).toHaveBeenCalledWith(
      'Agent Polystrat was skipped',
      undefined,
    );
  });

  it('does not throw when showNotification is undefined', () => {
    expect(() => notifySkipped(undefined, 'Omenstrat', 'reason')).not.toThrow();
  });
});

describe('notifyStartFailed', () => {
  it('calls showNotification with failure message', () => {
    const showNotification = jest.fn();
    notifyStartFailed(showNotification, 'Omenstrat');
    expect(showNotification).toHaveBeenCalledWith(
      'Failed to start Omenstrat',
      'Moving to next agent.',
    );
  });

  it('does not throw when showNotification is undefined', () => {
    expect(() => notifyStartFailed(undefined, 'Omenstrat')).not.toThrow();
  });
});

describe('getAgentFromService', () => {
  it('returns matching agent entry for trader service', () => {
    const service = makeService({
      service_public_id: AGENT_CONFIG[AgentMap.PredictTrader].servicePublicId,
      home_chain: AGENT_CONFIG[AgentMap.PredictTrader].middlewareHomeChainId,
    });
    const result = getAgentFromService(service);
    expect(result).toBeDefined();
    expect(result![0]).toBe(AgentMap.PredictTrader);
  });

  it('returns undefined when servicePublicId does not match', () => {
    const service = makeService({
      service_public_id: 'nonexistent/service:0.1.0',
      home_chain: MiddlewareChainMap.GNOSIS,
    });
    expect(getAgentFromService(service)).toBeUndefined();
  });

  it('returns undefined when home_chain does not match', () => {
    const service = makeService({
      service_public_id: AGENT_CONFIG[AgentMap.PredictTrader].servicePublicId,
      home_chain: MiddlewareChainMap.BASE,
    });
    expect(getAgentFromService(service)).toBeUndefined();
  });
});

describe('sortIncludedAgents', () => {
  const trader = AgentMap.PredictTrader;
  const optimus = AgentMap.Optimus;
  const polystrat = AgentMap.Polystrat;

  it('returns empty array when includedAgents is empty', () => {
    expect(sortIncludedAgents([], [trader, optimus])).toEqual([]);
  });

  it('filters out agents not in allowedAgents', () => {
    const included: IncludedAgent[] = [
      { agentType: trader, order: 0 },
      { agentType: optimus, order: 1 },
    ];
    const result = sortIncludedAgents(included, [trader]);
    expect(result).toHaveLength(1);
    expect(result[0].agentType).toBe(trader);
  });

  it('sorts by order ascending', () => {
    const included: IncludedAgent[] = [
      { agentType: optimus, order: 5 },
      { agentType: trader, order: 1 },
      { agentType: polystrat, order: 3 },
    ];
    const result = sortIncludedAgents(included, [trader, optimus, polystrat]);
    expect(result.map((a) => a.agentType)).toEqual([
      trader,
      polystrat,
      optimus,
    ]);
  });
});

describe('appendNewAgents', () => {
  it('appends agents with order continuing from max existing order', () => {
    const existing: IncludedAgent[] = [
      { agentType: AgentMap.PredictTrader, order: 0 },
      { agentType: AgentMap.Optimus, order: 2 },
    ];
    const result = appendNewAgents(existing, [AgentMap.Polystrat]);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ agentType: AgentMap.Polystrat, order: 3 });
  });

  it('starts from order 0 when existing is empty', () => {
    const result = appendNewAgents(
      [],
      [AgentMap.PredictTrader, AgentMap.Optimus],
    );
    expect(result).toEqual([
      { agentType: AgentMap.PredictTrader, order: 0 },
      { agentType: AgentMap.Optimus, order: 1 },
    ]);
  });

  it('handles multiple new agents with sequential orders', () => {
    const existing: IncludedAgent[] = [
      { agentType: AgentMap.PredictTrader, order: 0 },
    ];
    const result = appendNewAgents(existing, [
      AgentMap.Optimus,
      AgentMap.Polystrat,
    ]);
    expect(result[1]).toEqual({ agentType: AgentMap.Optimus, order: 1 });
    expect(result[2]).toEqual({ agentType: AgentMap.Polystrat, order: 2 });
  });
});

describe('normalizeIncludedAgents', () => {
  it('returns empty array when input is empty', () => {
    expect(normalizeIncludedAgents([])).toEqual([]);
  });

  it('deduplicates keeping first occurrence by order', () => {
    const agents: IncludedAgent[] = [
      { agentType: AgentMap.PredictTrader, order: 0 },
      { agentType: AgentMap.Optimus, order: 5 },
      { agentType: AgentMap.PredictTrader, order: 7 },
    ];
    const result = normalizeIncludedAgents(agents);
    expect(result).toEqual([
      { agentType: AgentMap.PredictTrader, order: 0 },
      { agentType: AgentMap.Optimus, order: 1 },
    ]);
  });

  it('re-sequences orders starting from 0', () => {
    const agents: IncludedAgent[] = [
      { agentType: AgentMap.Polystrat, order: 10 },
      { agentType: AgentMap.Optimus, order: 20 },
    ];
    const result = normalizeIncludedAgents(agents);
    expect(result[0].order).toBe(0);
    expect(result[1].order).toBe(1);
  });
});

describe('getAgentDisplayName', () => {
  it('returns displayName from AGENT_CONFIG', () => {
    expect(getAgentDisplayName(AgentMap.PredictTrader)).toBe(
      AGENT_CONFIG[AgentMap.PredictTrader].displayName,
    );
  });

  it('falls back to agentType string for unknown type', () => {
    expect(getAgentDisplayName('unknown_agent' as AgentType)).toBe(
      'unknown_agent',
    );
  });
});

describe('getDecommissionedAgentTypes', () => {
  it('returns agents that are under construction', () => {
    const agents = [
      {
        ...makeAutoRunAgentMeta(AgentMap.Modius, AGENT_CONFIG[AgentMap.Modius]),
        agentConfig: {
          ...AGENT_CONFIG[AgentMap.Modius],
          isUnderConstruction: true,
        },
      },
    ];
    expect(getDecommissionedAgentTypes(agents)).toEqual([AgentMap.Modius]);
  });

  it('returns agents that are not enabled', () => {
    const agents = [
      {
        ...makeAutoRunAgentMeta(
          AgentMap.PredictTrader,
          AGENT_CONFIG[AgentMap.PredictTrader],
        ),
        agentConfig: {
          ...AGENT_CONFIG[AgentMap.PredictTrader],
          isAgentEnabled: false,
        },
      },
    ];
    expect(getDecommissionedAgentTypes(agents)).toEqual([
      AgentMap.PredictTrader,
    ]);
  });

  it('returns empty for fully eligible agents', () => {
    const agents = [
      makeAutoRunAgentMeta(
        AgentMap.PredictTrader,
        AGENT_CONFIG[AgentMap.PredictTrader],
      ),
    ];
    expect(getDecommissionedAgentTypes(agents)).toEqual([]);
  });
});

describe('getEligibleAgentTypes', () => {
  it('excludes decommissioned agents', () => {
    const configured = [
      AgentMap.PredictTrader,
      AgentMap.Modius,
      AgentMap.Optimus,
    ];
    const decommissioned = [AgentMap.Modius];
    const result = getEligibleAgentTypes(configured, decommissioned);
    expect(result).toEqual([AgentMap.PredictTrader, AgentMap.Optimus]);
  });

  it('returns empty when configured is empty', () => {
    expect(getEligibleAgentTypes([], [AgentMap.Modius])).toEqual([]);
  });

  it('returns all when no decommissioned agents', () => {
    const configured = [AgentMap.PredictTrader, AgentMap.Optimus];
    expect(getEligibleAgentTypes(configured, [])).toEqual(configured);
  });

  it('excludes archived agents when passed in the blocked list', () => {
    const configured = [
      AgentMap.PredictTrader,
      AgentMap.AgentsFun,
      AgentMap.Optimus,
    ];
    const blocked = [AgentMap.AgentsFun]; // archived
    const result = getEligibleAgentTypes(configured, blocked);
    expect(result).toEqual([AgentMap.PredictTrader, AgentMap.Optimus]);
  });

  it('excludes both decommissioned and archived agents', () => {
    const configured = [
      AgentMap.PredictTrader,
      AgentMap.Modius,
      AgentMap.AgentsFun,
    ];
    const blocked = [AgentMap.Modius, AgentMap.AgentsFun];
    const result = getEligibleAgentTypes(configured, blocked);
    expect(result).toEqual([AgentMap.PredictTrader]);
  });
});

describe('getOrderedIncludedAgentTypes', () => {
  it('returns included agent types when list is non-empty', () => {
    const included = [
      { agentType: AgentMap.Optimus },
      { agentType: AgentMap.PredictTrader },
    ];
    const result = getOrderedIncludedAgentTypes(included, [
      AgentMap.PredictTrader,
    ]);
    expect(result).toEqual([AgentMap.Optimus, AgentMap.PredictTrader]);
  });

  it('falls back to eligible agent types when included is empty', () => {
    const eligible = [AgentMap.PredictTrader, AgentMap.Polystrat];
    const result = getOrderedIncludedAgentTypes([], eligible);
    expect(result).toEqual(eligible);
  });
});

describe('getExcludedAgentTypes', () => {
  it('returns configured agents not in included list', () => {
    const configured = [
      AgentMap.PredictTrader,
      AgentMap.Optimus,
      AgentMap.Polystrat,
    ];
    const included = [AgentMap.PredictTrader, AgentMap.Polystrat];
    const result = getExcludedAgentTypes(configured, included);
    expect(result).toEqual([AgentMap.Optimus]);
  });

  it('returns empty when all configured are included', () => {
    const configured = [AgentMap.PredictTrader];
    const result = getExcludedAgentTypes(configured, configured);
    expect(result).toEqual([]);
  });
});
