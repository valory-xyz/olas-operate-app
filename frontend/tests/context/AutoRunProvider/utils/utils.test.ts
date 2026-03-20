import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap, AgentType } from '../../../../constants/agent';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { IncludedAgentInstance } from '../../../../context/AutoRunProvider/types';
import {
  appendNewInstances,
  getAgentDisplayName,
  getAgentFromService,
  getDecommissionedInstances,
  getEligibleInstances,
  getExcludedInstances,
  getInstanceDisplayNames,
  getOrderedIncludedInstances,
  normalizeIncludedInstances,
  notifySkipped,
  notifyStartFailed,
  sortIncludedInstances,
} from '../../../../context/AutoRunProvider/utils/utils';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAutoRunAgentMeta,
  makeService,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
} from '../../../helpers/factories';

describe('notifySkipped', () => {
  it('calls showNotification with agent name, instance name, and reason', () => {
    const showNotification = jest.fn();
    notifySkipped(
      showNotification,
      'Omenstrat',
      'corzim-vardor96',
      'Low balance',
    );
    expect(showNotification).toHaveBeenCalledWith(
      'Omenstrat agent "corzim-vardor96" was skipped',
      'Low balance',
    );
  });

  it('calls showNotification without reason when undefined', () => {
    const showNotification = jest.fn();
    notifySkipped(showNotification, 'Polystrat', 'nekfam-nushim36');
    expect(showNotification).toHaveBeenCalledWith(
      'Polystrat agent "nekfam-nushim36" was skipped',
      undefined,
    );
  });

  it('does not throw when showNotification is undefined', () => {
    expect(() =>
      notifySkipped(undefined, 'Omenstrat', 'corzim-vardor96', 'reason'),
    ).not.toThrow();
  });
});

describe('notifyStartFailed', () => {
  it('calls showNotification with failure message', () => {
    const showNotification = jest.fn();
    notifyStartFailed(showNotification, 'Optimus', 'nekfam-nushim36');
    expect(showNotification).toHaveBeenCalledWith(
      'Failed to start Optimus agent "nekfam-nushim36"',
      'Moving to next agent.',
    );
  });

  it('does not throw when showNotification is undefined', () => {
    expect(() =>
      notifyStartFailed(undefined, 'Omenstrat', 'corzim-vardor96'),
    ).not.toThrow();
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
    expect(result?.[0]).toBe(AgentMap.PredictTrader);
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

describe('sortIncludedInstances', () => {
  const scA = DEFAULT_SERVICE_CONFIG_ID;
  const scB = MOCK_SERVICE_CONFIG_ID_2;
  const scC = MOCK_SERVICE_CONFIG_ID_3;

  it('returns empty array when includedInstances is empty', () => {
    expect(sortIncludedInstances([], [scA, scB])).toEqual([]);
  });

  it('filters out instances not in allowedInstances', () => {
    const included: IncludedAgentInstance[] = [
      { serviceConfigId: scA, order: 0 },
      { serviceConfigId: scB, order: 1 },
    ];
    const result = sortIncludedInstances(included, [scA]);
    expect(result).toHaveLength(1);
    expect(result[0].serviceConfigId).toBe(scA);
  });

  it('sorts by order ascending', () => {
    const included: IncludedAgentInstance[] = [
      { serviceConfigId: scB, order: 5 },
      { serviceConfigId: scA, order: 1 },
      { serviceConfigId: scC, order: 3 },
    ];
    const result = sortIncludedInstances(included, [scA, scB, scC]);
    expect(result.map((a) => a.serviceConfigId)).toEqual([scA, scC, scB]);
  });
});

describe('appendNewInstances', () => {
  it('appends instances with order continuing from max existing order', () => {
    const existing: IncludedAgentInstance[] = [
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
      { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 2 },
    ];
    const result = appendNewInstances(existing, [MOCK_SERVICE_CONFIG_ID_3]);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({
      serviceConfigId: MOCK_SERVICE_CONFIG_ID_3,
      order: 3,
    });
  });

  it('starts from order 0 when existing is empty', () => {
    const result = appendNewInstances(
      [],
      [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_2],
    );
    expect(result).toEqual([
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
      { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 1 },
    ]);
  });

  it('handles multiple new instances with sequential orders', () => {
    const existing: IncludedAgentInstance[] = [
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
    ];
    const result = appendNewInstances(existing, [
      MOCK_SERVICE_CONFIG_ID_2,
      MOCK_SERVICE_CONFIG_ID_3,
    ]);
    expect(result[1]).toEqual({
      serviceConfigId: MOCK_SERVICE_CONFIG_ID_2,
      order: 1,
    });
    expect(result[2]).toEqual({
      serviceConfigId: MOCK_SERVICE_CONFIG_ID_3,
      order: 2,
    });
  });
});

describe('normalizeIncludedInstances', () => {
  it('returns empty array when input is empty', () => {
    expect(normalizeIncludedInstances([])).toEqual([]);
  });

  it('deduplicates keeping first occurrence by order', () => {
    const instances: IncludedAgentInstance[] = [
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
      { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 5 },
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 7 },
    ];
    const result = normalizeIncludedInstances(instances);
    expect(result).toEqual([
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
      { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 1 },
    ]);
  });

  it('re-sequences orders starting from 0', () => {
    const instances: IncludedAgentInstance[] = [
      { serviceConfigId: MOCK_SERVICE_CONFIG_ID_3, order: 10 },
      { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 20 },
    ];
    const result = normalizeIncludedInstances(instances);
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

describe('getInstanceDisplayNames', () => {
  it('returns agentName and instanceName for a known serviceConfigId', () => {
    const agents = [
      makeAutoRunAgentMeta(
        AgentMap.PredictTrader,
        AGENT_CONFIG[AgentMap.PredictTrader],
      ),
    ];
    const result = getInstanceDisplayNames(DEFAULT_SERVICE_CONFIG_ID, agents);
    expect(result.agentName).toBe(
      AGENT_CONFIG[AgentMap.PredictTrader].displayName,
    );
    expect(typeof result.instanceName).toBe('string');
  });

  it('falls back to serviceConfigId when not found', () => {
    const result = getInstanceDisplayNames('sc-unknown', []);
    expect(result.agentName).toBe('sc-unknown');
    expect(result.instanceName).toBe('sc-unknown');
  });
});

describe('getDecommissionedInstances', () => {
  it('returns serviceConfigIds of agents that are under construction', () => {
    const agents = [
      {
        ...makeAutoRunAgentMeta(AgentMap.Modius, AGENT_CONFIG[AgentMap.Modius]),
        agentConfig: {
          ...AGENT_CONFIG[AgentMap.Modius],
          isUnderConstruction: true,
        },
      },
    ];
    expect(getDecommissionedInstances(agents)).toEqual([
      DEFAULT_SERVICE_CONFIG_ID,
    ]);
  });

  it('returns serviceConfigIds of agents that are not enabled', () => {
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
    expect(getDecommissionedInstances(agents)).toEqual([
      DEFAULT_SERVICE_CONFIG_ID,
    ]);
  });

  it('returns empty for fully eligible agents', () => {
    const agents = [
      makeAutoRunAgentMeta(
        AgentMap.PredictTrader,
        AGENT_CONFIG[AgentMap.PredictTrader],
      ),
    ];
    expect(getDecommissionedInstances(agents)).toEqual([]);
  });
});

describe('getEligibleInstances', () => {
  it('excludes decommissioned instances', () => {
    const configured = [
      DEFAULT_SERVICE_CONFIG_ID,
      MOCK_SERVICE_CONFIG_ID_2,
      MOCK_SERVICE_CONFIG_ID_3,
    ];
    const decommissioned = [MOCK_SERVICE_CONFIG_ID_2];
    const result = getEligibleInstances(configured, decommissioned);
    expect(result).toEqual([
      DEFAULT_SERVICE_CONFIG_ID,
      MOCK_SERVICE_CONFIG_ID_3,
    ]);
  });

  it('returns empty when configured is empty', () => {
    expect(getEligibleInstances([], [MOCK_SERVICE_CONFIG_ID_2])).toEqual([]);
  });

  it('returns all when no decommissioned instances', () => {
    const configured = [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_2];
    expect(getEligibleInstances(configured, [])).toEqual(configured);
  });
});

describe('getOrderedIncludedInstances', () => {
  it('returns included serviceConfigIds when list is non-empty', () => {
    const included = [
      { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2 },
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID },
    ];
    const result = getOrderedIncludedInstances(included, [
      DEFAULT_SERVICE_CONFIG_ID,
    ]);
    expect(result).toEqual([
      MOCK_SERVICE_CONFIG_ID_2,
      DEFAULT_SERVICE_CONFIG_ID,
    ]);
  });

  it('falls back to eligible instances when included is empty', () => {
    const eligible = [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_3];
    const result = getOrderedIncludedInstances([], eligible);
    expect(result).toEqual(eligible);
  });
});

describe('getExcludedInstances', () => {
  it('returns configured instances not in included list', () => {
    const configured = [
      DEFAULT_SERVICE_CONFIG_ID,
      MOCK_SERVICE_CONFIG_ID_2,
      MOCK_SERVICE_CONFIG_ID_3,
    ];
    const included = [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_3];
    const result = getExcludedInstances(configured, included);
    expect(result).toEqual([MOCK_SERVICE_CONFIG_ID_2]);
  });

  it('returns empty when all configured are included', () => {
    const configured = [DEFAULT_SERVICE_CONFIG_ID];
    const result = getExcludedInstances(configured, configured);
    expect(result).toEqual([]);
  });
});
