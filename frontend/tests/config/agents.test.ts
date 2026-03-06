import {
  ACTIVE_AGENTS,
  AGENT_CONFIG,
  AVAILABLE_FOR_ADDING_AGENTS,
} from '../../config/agents';
import { AgentMap } from '../../constants/agent';

describe('AGENT_CONFIG', () => {
  it('has an entry for every agent type', () => {
    const agentTypes = Object.values(AgentMap);
    for (const agentType of agentTypes) {
      expect(AGENT_CONFIG[agentType]).toBeDefined();
    }
  });

  it('each agent has required fields', () => {
    for (const [, config] of Object.entries(AGENT_CONFIG)) {
      expect(config.name).toBeDefined();
      expect(config.evmHomeChainId).toBeDefined();
      expect(config.middlewareHomeChainId).toBeDefined();
      expect(config.agentIds).toBeDefined();
      expect(Array.isArray(config.agentIds)).toBe(true);
      expect(config.defaultStakingProgramId).toBeDefined();
      expect(config.serviceApi).toBeDefined();
    }
  });

  it('PredictTrader is enabled', () => {
    expect(AGENT_CONFIG[AgentMap.PredictTrader].isAgentEnabled).toBe(true);
  });

  it('additionalRequirements values are finite numbers', () => {
    for (const config of Object.values(AGENT_CONFIG)) {
      if (!config.additionalRequirements) continue;

      for (const tokenRequirementsByChain of Object.values(
        config.additionalRequirements,
      )) {
        for (const requiredAmount of Object.values(tokenRequirementsByChain)) {
          expect(Number.isFinite(requiredAmount)).toBe(true);
          expect(requiredAmount).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('ACTIVE_AGENTS', () => {
  it('is derived from AGENT_CONFIG by filtering enabled agents', () => {
    const expected = Object.entries(AGENT_CONFIG).filter(
      ([, config]) => !!config.isAgentEnabled,
    );
    expect(ACTIVE_AGENTS).toEqual(expected);
  });
});

describe('AVAILABLE_FOR_ADDING_AGENTS', () => {
  it('is derived from ACTIVE_AGENTS by excluding under-construction agents', () => {
    const expected = ACTIVE_AGENTS.filter(
      ([, config]) => !config.isUnderConstruction,
    );
    expect(AVAILABLE_FOR_ADDING_AGENTS).toEqual(expected);
  });
});
