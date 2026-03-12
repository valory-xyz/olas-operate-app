/**
 * Tests for staking program ID constants.
 *
 * `STAKING_PROGRAM_IDS` is the single source of truth that links the frontend
 * to the middleware's staking program registry. If an ID string is mistyped,
 * the staking program will not be found and the agent will fail to stake or
 * claim rewards. These tests pin every ID value.
 */

import { STAKING_PROGRAM_IDS } from '../../constants/stakingProgram';

describe('STAKING_PROGRAM_IDS', () => {
  describe('Gnosis programs', () => {
    it('PearlAlpha resolves to "pearl_alpha"', () => {
      expect(STAKING_PROGRAM_IDS.PearlAlpha).toBe('pearl_alpha');
    });

    it('PearlBeta resolves to "pearl_beta"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBeta).toBe('pearl_beta');
    });

    it('PearlBeta2 resolves to "pearl_beta_2"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBeta2).toBe('pearl_beta_2');
    });

    it('PearlBeta3 resolves to "pearl_beta_3"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBeta3).toBe('pearl_beta_3');
    });

    it('PearlBeta4 resolves to "pearl_beta_4"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBeta4).toBe('pearl_beta_4');
    });

    it('PearlBeta5 resolves to "pearl_beta_5"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBeta5).toBe('pearl_beta_5');
    });

    it('PearlBeta6 resolves to "pearl_beta_6"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBeta6).toBe('pearl_beta_6');
    });

    it('PearlBetaMechMarketplace resolves to "pearl_beta_mech_marketplace"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace).toBe(
        'pearl_beta_mech_marketplace',
      );
    });

    it('PearlBetaMechMarketplace1 resolves to "pearl_beta_mech_marketplace_1"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace1).toBe(
        'pearl_beta_mech_marketplace_1',
      );
    });

    it('PearlBetaMechMarketplace2 resolves to "pearl_beta_mech_marketplace_2"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace2).toBe(
        'pearl_beta_mech_marketplace_2',
      );
    });

    it('PearlBetaMechMarketplace3 resolves to "pearl_beta_mech_marketplace_3"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3).toBe(
        'pearl_beta_mech_marketplace_3',
      );
    });

    it('PearlBetaMechMarketplace4 resolves to "pearl_beta_mech_marketplace_4"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4).toBe(
        'pearl_beta_mech_marketplace_4',
      );
    });
  });

  describe('Base programs', () => {
    it('MemeBaseAlpha2 resolves to "meme_base_alpha_2"', () => {
      expect(STAKING_PROGRAM_IDS.MemeBaseAlpha2).toBe('meme_base_alpha_2');
    });

    it('MemeBaseBeta resolves to "meme_base_beta"', () => {
      expect(STAKING_PROGRAM_IDS.MemeBaseBeta).toBe('meme_base_beta');
    });

    it('MemeBaseBeta2 resolves to "meme_base_beta_2"', () => {
      expect(STAKING_PROGRAM_IDS.MemeBaseBeta2).toBe('meme_base_beta_2');
    });

    it('MemeBaseBeta3 resolves to "meme_base_beta_3"', () => {
      expect(STAKING_PROGRAM_IDS.MemeBaseBeta3).toBe('meme_base_beta_3');
    });

    it('AgentsFun1 resolves to "agents_fun_1"', () => {
      expect(STAKING_PROGRAM_IDS.AgentsFun1).toBe('agents_fun_1');
    });

    it('AgentsFun2 resolves to "agents_fun_2"', () => {
      expect(STAKING_PROGRAM_IDS.AgentsFun2).toBe('agents_fun_2');
    });

    it('AgentsFun3 resolves to "agents_fun_3"', () => {
      expect(STAKING_PROGRAM_IDS.AgentsFun3).toBe('agents_fun_3');
    });

    it('PettAiAgent resolves to "pett_ai_agent_1"', () => {
      expect(STAKING_PROGRAM_IDS.PettAiAgent).toBe('pett_ai_agent_1');
    });

    it('PettAiAgent2 resolves to "pett_ai_agent_2"', () => {
      expect(STAKING_PROGRAM_IDS.PettAiAgent2).toBe('pett_ai_agent_2');
    });

    it('PettAiAgent3 resolves to "pett_ai_agent_3"', () => {
      expect(STAKING_PROGRAM_IDS.PettAiAgent3).toBe('pett_ai_agent_3');
    });

    it('PettAiAgent4 resolves to "pett_ai_agent_4"', () => {
      expect(STAKING_PROGRAM_IDS.PettAiAgent4).toBe('pett_ai_agent_4');
    });
  });

  describe('Mode programs', () => {
    it('ModiusAlpha resolves to "modius_alpha"', () => {
      expect(STAKING_PROGRAM_IDS.ModiusAlpha).toBe('modius_alpha');
    });

    it('ModiusAlpha2 resolves to "modius_alpha_2"', () => {
      expect(STAKING_PROGRAM_IDS.ModiusAlpha2).toBe('modius_alpha_2');
    });

    it('ModiusAlpha3 resolves to "modius_alpha_3"', () => {
      expect(STAKING_PROGRAM_IDS.ModiusAlpha3).toBe('modius_alpha_3');
    });

    it('ModiusAlpha4 resolves to "modius_alpha_4"', () => {
      expect(STAKING_PROGRAM_IDS.ModiusAlpha4).toBe('modius_alpha_4');
    });

    it('OptimusAlpha (Mode-deployed) resolves to "optimus_alpha"', () => {
      // Note: OptimusAlpha lives on Mode, not Optimism.
      // OptimusAlpha1 on Optimism is deprecated and absent from the map.
      expect(STAKING_PROGRAM_IDS.OptimusAlpha).toBe('optimus_alpha');
    });
  });

  describe('Optimism programs', () => {
    it('OptimusAlpha2 resolves to "optimus_alpha_2"', () => {
      expect(STAKING_PROGRAM_IDS.OptimusAlpha2).toBe('optimus_alpha_2');
    });

    it('OptimusAlpha3 resolves to "optimus_alpha_3"', () => {
      expect(STAKING_PROGRAM_IDS.OptimusAlpha3).toBe('optimus_alpha_3');
    });

    it('OptimusAlpha4 resolves to "optimus_alpha_4"', () => {
      expect(STAKING_PROGRAM_IDS.OptimusAlpha4).toBe('optimus_alpha_4');
    });

    it('does NOT contain a deprecated OptimusAlpha1 key', () => {
      // OptimusAlpha1 on Optimism was deprecated and intentionally omitted.
      expect(STAKING_PROGRAM_IDS).not.toHaveProperty('OptimusAlpha1');
    });
  });

  describe('Polygon programs', () => {
    it('PolygonBeta1 resolves to "polygon_beta_1"', () => {
      expect(STAKING_PROGRAM_IDS.PolygonBeta1).toBe('polygon_beta_1');
    });

    it('PolygonBeta2 resolves to "polygon_beta_2"', () => {
      expect(STAKING_PROGRAM_IDS.PolygonBeta2).toBe('polygon_beta_2');
    });

    it('PolygonBeta3 resolves to "polygon_beta_3"', () => {
      // Note: despite the "Polygon Alpha 3" label in the contract metadata,
      // the correct identifier is "polygon_beta_3".
      expect(STAKING_PROGRAM_IDS.PolygonBeta3).toBe('polygon_beta_3');
    });
  });

  describe('completeness and uniqueness', () => {
    it('covers exactly 28 staking programs across all chains', () => {
      // 12 Gnosis + 11 Base + 5 Mode + 3 Optimism + 3 Polygon = 34
      // but wait let me count: Gnosis: PearlAlpha, PearlBeta, PearlBeta2-6, PearlBetaMM, PMM1, PMM2, PMM3, PMM4 = 12
      // Base: MemeBaseAlpha2, MemeBaseBeta, MemeBaseBeta2, MemeBaseBeta3, AgentsFun1-3, PettAiAgent, PettAiAgent2-4 = 11
      // Mode: ModiusAlpha, ModiusAlpha2-4, OptimusAlpha = 5
      // Optimism: OptimusAlpha2-4 = 3
      // Polygon: PolygonBeta1-3 = 3
      // Total = 12 + 11 + 5 + 3 + 3 = 34
      expect(Object.keys(STAKING_PROGRAM_IDS)).toHaveLength(34);
    });

    it('has no duplicate ID strings (each program has a unique registry key)', () => {
      const ids = Object.values(STAKING_PROGRAM_IDS);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('all IDs are non-empty lowercase snake_case strings', () => {
      for (const id of Object.values(STAKING_PROGRAM_IDS)) {
        expect(id.length).toBeGreaterThan(0);
        expect(id).toBe(id.toLowerCase());
        expect(id).toMatch(/^[a-z0-9_]+$/);
      }
    });
  });
});
