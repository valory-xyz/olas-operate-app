/**
 * Tests for the defensive guards in config/agents.ts.
 *
 * Three private helpers — getModiusUsdcConfig, getOptimusUsdcConfig, and
 * getPolystratUsdceConfig — have two guarded paths each:
 *
 * 1. Throw path: if the token config is missing entirely (USDC removed from
 *    TOKEN_CONFIG), throw with a descriptive message instead of computing NaN.
 *
 * 2. Zero fallback (|| 0): if `fund_requirements[address]?.safe` is undefined
 *    (e.g. the service template has no fund_requirements for the chain), the
 *    expression falls back to 0 rather than undefined. This ensures
 *    additionalRequirements always contains a finite number.
 *
 * These are module-initialization guards (they run when the module loads),
 * so they can only be triggered by loading the module with mocked dependencies.
 * We use jest.isolateModules to reset the module registry for each test and
 * avoid cross-contamination.
 */

// The top-level ethers-multicall mock is hoisted and covers all require() calls
// that transitively load constants/providers.ts.
jest.mock(
  'ethers-multicall',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../mocks/ethersMulticall').ethersMulticallMock,
);

describe('config/agents defensive guards — throw paths', () => {
  afterEach(() => {
    // jest.mock() inside isolateModules registers the factory globally.
    // Restore each mock after the test so it doesn't bleed into subsequent tests.
    jest.unmock('../../config/tokens');
  });

  it('throws "Modius USDC config not found" when USDC is absent from MODE_TOKEN_CONFIG', () => {
    jest.isolateModules(() => {
      // Remove USDC from Mode token config to trigger the Modius guard
      jest.mock('../../config/tokens', () => {
        const actual = jest.requireActual(
          '../../config/tokens',
        ) as typeof import('../../config/tokens');
        return { ...actual, MODE_TOKEN_CONFIG: {} };
      });
      // Loading the module triggers module-level initialization which calls getModiusUsdcConfig()
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      expect(() => require('../../config/agents')).toThrow(
        'Modius USDC config not found',
      );
    });
  });

  it('throws "Optimus USDC config not found" when USDC is absent from OPTIMISM_TOKEN_CONFIG', () => {
    jest.isolateModules(() => {
      // Remove USDC from Optimism token config to trigger the Optimus guard
      jest.mock('../../config/tokens', () => {
        const actual = jest.requireActual(
          '../../config/tokens',
        ) as typeof import('../../config/tokens');
        return { ...actual, OPTIMISM_TOKEN_CONFIG: {} };
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      expect(() => require('../../config/agents')).toThrow(
        'Optimus USDC config not found',
      );
    });
  });

  it('throws "Polystrat USDC.e config not found" when USDC.e is absent from POLYGON_TOKEN_CONFIG', () => {
    jest.isolateModules(() => {
      // Remove USDC.e from Polygon token config to trigger the Polystrat guard
      jest.mock('../../config/tokens', () => {
        const actual = jest.requireActual(
          '../../config/tokens',
        ) as typeof import('../../config/tokens');
        return { ...actual, POLYGON_TOKEN_CONFIG: {} };
      });
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      expect(() => require('../../config/agents')).toThrow(
        'Polystrat USDC.e config not found',
      );
    });
  });
});

describe('config/agents || 0 fallback — missing fund_requirements', () => {
  /**
   * When the service template has no `fund_requirements` entry for the chain
   * (e.g. during testing or when a new agent type is added before the template
   * is fully configured), `?.safe` evaluates to `undefined` and the `|| 0`
   * fallback ensures additionalRequirements[chain][token] is always 0 rather
   * than undefined.
   *
   * We mock both service template modules to have empty `configurations` so
   * that all three `|| 0` branches are exercised in a single test.
   */
  it('returns 0 for additionalRequirements when service template has no fund_requirements', () => {
    jest.isolateModules(() => {
      // Mock the service templates with empty configurations — no chain-specific
      // fund_requirements, so modiusFundRequirements / optimusFundRequirements /
      // polystratFundRequirements are all undefined → ?.safe is undefined → || 0.
      jest.mock('../../constants/serviceTemplates', () => ({
        MODIUS_SERVICE_TEMPLATE: { configurations: {} },
        OPTIMUS_SERVICE_TEMPLATE: { configurations: {} },
      }));
      jest.mock('../../constants/serviceTemplates/service/trader', () => ({
        PREDICT_POLYMARKET_SERVICE_TEMPLATE: { configurations: {} },
      }));

      /* eslint-disable @typescript-eslint/no-var-requires */
      const { AGENT_CONFIG } =
        require('../../config/agents') as typeof import('../../config/agents');
      /* eslint-enable @typescript-eslint/no-var-requires */

      // Type helper: additionalRequirements is indexed by chain then by token symbol
      type AdditionalRequirements = Record<number, Record<string, number>>;

      // All three agents should compute 0 via the || 0 fallback
      const modiusRequirements = AGENT_CONFIG.modius
        .additionalRequirements as AdditionalRequirements;
      expect(modiusRequirements[34443].USDC).toBe(0);

      const optimusRequirements = AGENT_CONFIG.optimus
        .additionalRequirements as AdditionalRequirements;
      expect(optimusRequirements[10].USDC).toBe(0);

      // AgentMap.Polystrat = 'polymarket_trader'
      const polystratRequirements = AGENT_CONFIG.polymarket_trader
        .additionalRequirements as AdditionalRequirements;
      expect(polystratRequirements[137]['USDC.e']).toBe(0);
    });
  });
});
