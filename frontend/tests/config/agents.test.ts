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

  it.each(
    Object.entries(AGENT_CONFIG).filter(
      ([, config]) => 'isComingSoon' in config,
    ),
  )('%s.isComingSoon is a boolean', (_, config) => {
    expect(typeof config.isComingSoon).toBe('boolean');
  });

  it.each(
    Object.entries(AGENT_CONFIG).filter(
      ([, config]) => 'isUnderConstruction' in config,
    ),
  )('%s.isUnderConstruction is a boolean', (_, config) => {
    expect(typeof config.isUnderConstruction).toBe('boolean');
  });

  it.each(
    Object.entries(AGENT_CONFIG).filter(
      ([, config]) => 'doesChatUiRequireApiKey' in config,
    ),
  )('%s.doesChatUiRequireApiKey is a boolean', (_, config) => {
    expect(typeof config.doesChatUiRequireApiKey).toBe('boolean');
  });

  it.each(
    Object.entries(AGENT_CONFIG).filter(
      ([, config]) => 'requiresSetup' in config,
    ),
  )('%s.requiresSetup is a boolean', (_, config) => {
    expect(typeof config.requiresSetup).toBe('boolean');
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

describe('defensive guard: getModiusUsdcConfig throws when USDC config is missing', () => {
  it('throws "Modius USDC config not found"', () => {
    expect(() => {
      jest.isolateModules(() => {
        jest.mock('../../config/tokens', () => {
          const actual = jest.requireActual('../../config/tokens');
          return {
            ...actual,
            MODE_TOKEN_CONFIG: {},
          };
        });
        require('../../config/agents');
      });
    }).toThrow('Modius USDC config not found');
  });
});

describe('defensive guard: getOptimusUsdcConfig throws when USDC config is missing', () => {
  it('throws "Optimus USDC config not found"', () => {
    expect(() => {
      jest.isolateModules(() => {
        jest.mock('../../config/tokens', () => {
          const actual = jest.requireActual('../../config/tokens');
          return {
            ...actual,
            OPTIMISM_TOKEN_CONFIG: {},
          };
        });
        require('../../config/agents');
      });
    }).toThrow('Optimus USDC config not found');
  });
});

describe('defensive guard: getPolystratPusdConfig throws when pUSD config is missing', () => {
  it('throws "Polystrat pUSD config not found"', () => {
    expect(() => {
      jest.isolateModules(() => {
        jest.mock('../../config/tokens', () => {
          const actual = jest.requireActual('../../config/tokens');
          return {
            ...actual,
            POLYGON_TOKEN_CONFIG: {},
          };
        });
        require('../../config/agents');
      });
    }).toThrow('Polystrat pUSD config not found');
  });
});
