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

    it('PearlBetaMechMarketplace5 resolves to "pearl_beta_mech_marketplace_5"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace5).toBe(
        'pearl_beta_mech_marketplace_5',
      );
    });

    it('PearlBetaMechMarketplace6 resolves to "pearl_beta_mech_marketplace_6"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace6).toBe(
        'pearl_beta_mech_marketplace_6',
      );
    });

    it('PearlBetaMechMarketplace7 resolves to "pearl_beta_mech_marketplace_7"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace7).toBe(
        'pearl_beta_mech_marketplace_7',
      );
    });

    it('PearlBetaMechMarketplace8 resolves to "pearl_beta_mech_marketplace_8"', () => {
      expect(STAKING_PROGRAM_IDS.PearlBetaMechMarketplace8).toBe(
        'pearl_beta_mech_marketplace_8',
      );
    });

    it.each([
      ['OmenstratI', 'omenstrat_i'],
      ['OmenstratII', 'omenstrat_ii'],
      ['OmenstratIII', 'omenstrat_iii'],
      ['OmenstratIV', 'omenstrat_iv'],
      ['OmenstratV', 'omenstrat_v'],
      ['OmenstratVI', 'omenstrat_vi'],
      ['OmenstratVII', 'omenstrat_vii'],
      ['OmenstratVIII', 'omenstrat_viii'],
      ['OmenstratIX', 'omenstrat_ix'],
      ['OmenstratX', 'omenstrat_x'],
    ] as const)('%s resolves to "%s" (decoupled-activity)', (key, value) => {
      expect(STAKING_PROGRAM_IDS[key]).toBe(value);
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

    it.each([
      ['BasiusI', 'basius_i'],
      ['BasiusII', 'basius_ii'],
      ['BasiusIII', 'basius_iii'],
      ['BasiusIV', 'basius_iv'],
      ['BasiusV', 'basius_v'],
      ['BasiusVI', 'basius_vi'],
    ] as const)('%s resolves to "%s" (decoupled-activity)', (key, value) => {
      expect(STAKING_PROGRAM_IDS[key]).toBe(value);
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

    it.each([
      ['OptimusI', 'optimus_i'],
      ['OptimusII', 'optimus_ii'],
      ['OptimusIII', 'optimus_iii'],
      ['OptimusIV', 'optimus_iv'],
      ['OptimusV', 'optimus_v'],
      ['OptimusVI', 'optimus_vi'],
    ] as const)('%s resolves to "%s" (decoupled-activity)', (key, value) => {
      expect(STAKING_PROGRAM_IDS[key]).toBe(value);
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

    it.each([
      ['PolystratI', 'polystrat_i'],
      ['PolystratII', 'polystrat_ii'],
      ['PolystratIII', 'polystrat_iii'],
      ['PolystratIV', 'polystrat_iv'],
      ['PolystratV', 'polystrat_v'],
      ['PolystratVI', 'polystrat_vi'],
      ['PolystratVII', 'polystrat_vii'],
      ['PolystratVIII', 'polystrat_viii'],
      ['PolystratIX', 'polystrat_ix'],
    ] as const)('%s resolves to "%s" (decoupled-activity)', (key, value) => {
      expect(STAKING_PROGRAM_IDS[key]).toBe(value);
    });
  });

  describe('completeness and uniqueness', () => {
    it('covers exactly 74 staking programs across all chains', () => {
      // Chain totals: 26 Gnosis (16 legacy + 10 Omenstrat) + 17 Base (11 + 6 Basius)
      // + 5 Mode + 9 Optimism (3 legacy + 6 Optimus) + 12 Polygon (3 legacy + 9 Polystrat)
      // + 2 Connect on Gnosis + 3 Connect on Robinhood = 74
      expect(Object.keys(STAKING_PROGRAM_IDS)).toHaveLength(74);
    });

    it('repeats an ID string only for Connect, whose ids are unique per chain', () => {
      const keysById = new Map<string, string[]>();
      for (const [key, id] of Object.entries(STAKING_PROGRAM_IDS)) {
        keysById.set(id, [...(keysById.get(id) ?? []), key]);
      }
      const repeated = [...keysById.entries()].filter(
        ([, keys]) => keys.length > 1,
      );
      expect(repeated).toEqual([
        ['connect_i', ['ConnectGnosisI', 'ConnectRobinhoodI']],
        ['connect_ii', ['ConnectGnosisII', 'ConnectRobinhoodII']],
      ]);
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
