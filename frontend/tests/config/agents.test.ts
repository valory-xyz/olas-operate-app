import {
  ACTIVE_AGENTS,
  AGENT_CONFIG,
  AVAILABLE_FOR_ADDING_AGENTS,
} from '../../config/agents';
import { TokenSymbolMap } from '../../config/tokens';
import { AgentMap } from '../../constants/agent';
import { EvmChainIdMap } from '../../constants/chains';

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

  it.each(
    Object.entries(AGENT_CONFIG).filter(
      ([, config]) => 'isPhasedOut' in config,
    ),
  )('%s.isPhasedOut is a boolean', (_, config) => {
    expect(typeof config.isPhasedOut).toBe('boolean');
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

  it('Polystrat additionalRequirements surfaces pUSD safe amount from service template', () => {
    const polystratRequirements =
      AGENT_CONFIG[AgentMap.Polystrat].additionalRequirements;
    expect(
      polystratRequirements?.[EvmChainIdMap.Polygon]?.[TokenSymbolMap.pUSD],
    ).toBe(65);
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

  it('includes agents with isAddingNewBlocked (they occupy a slot but block new creation, not listing)', () => {
    const blocked = AVAILABLE_FOR_ADDING_AGENTS.filter(
      ([, config]) => config.isAddingNewBlocked,
    );
    expect(blocked.length).toBeGreaterThan(0);
  });
});

describe('PettAi creation blocking and deprecation', () => {
  it('has isAddingNewBlocked set to true', () => {
    expect(AGENT_CONFIG[AgentMap.PettAi].isAddingNewBlocked).toBe(true);
  });

  it('has no shutdownDate (deprecation banner removed)', () => {
    expect(AGENT_CONFIG[AgentMap.PettAi].shutdownDate).toBeUndefined();
  });

  it('PettAi still appears in ACTIVE_AGENTS', () => {
    const pettAiEntry = ACTIVE_AGENTS.find(
      ([agentType]) => agentType === AgentMap.PettAi,
    );
    expect(pettAiEntry).toBeDefined();
  });

  it('PettAi appears in AVAILABLE_FOR_ADDING_AGENTS (isAddingNewBlocked does not filter from list)', () => {
    const pettAiEntry = AVAILABLE_FOR_ADDING_AGENTS.find(
      ([agentType]) => agentType === AgentMap.PettAi,
    );
    expect(pettAiEntry).toBeDefined();
  });
});

describe('Agents.fun phase-out', () => {
  it('is marked phased out', () => {
    expect(AGENT_CONFIG[AgentMap.AgentsFun].isPhasedOut).toBe(true);
  });

  it('stays enabled and listed so the sidebar entry and withdraw flow remain reachable', () => {
    expect(AGENT_CONFIG[AgentMap.AgentsFun].isAgentEnabled).toBe(true);
    const entry = ACTIVE_AGENTS.find(
      ([agentType]) => agentType === AgentMap.AgentsFun,
    );
    expect(entry).toBeDefined();
  });

  it('still blocks creation of new instances', () => {
    expect(AGENT_CONFIG[AgentMap.AgentsFun].isAddingNewBlocked).toBe(true);
  });

  it('is not under construction (keeps staking section visible)', () => {
    expect(AGENT_CONFIG[AgentMap.AgentsFun].isUnderConstruction).toBe(false);
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
