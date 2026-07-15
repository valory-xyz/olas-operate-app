import { act, renderHook } from '@testing-library/react';

import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { SETUP_SCREEN } from '../../constants/setupScreen';
import { useCreateConnectService } from '../../hooks/useCreateConnectService';

// --- Connect template (mocked to avoid parseEther / real config) ------------
jest.mock('../../constants/serviceTemplates/service/connect', () => ({
  CONNECT_SERVICE_TEMPLATE: {
    name: 'Connect Agent',
    hash: 'connect-hash',
    home_chain: 'gnosis',
    configurations: {
      polygon: { nft: 'poly-nft', agent_id: 116, cost_of_bond: '0' },
      base: { nft: 'base-nft', agent_id: 116, cost_of_bond: '0' },
      gnosis: { nft: 'gnosis-nft', agent_id: 116, cost_of_bond: '0' },
    },
  },
}));

const { CONNECT_SERVICE_TEMPLATE } = jest.requireMock(
  '../../constants/serviceTemplates/service/connect',
);
const BASE_CONFIG = CONNECT_SERVICE_TEMPLATE.configurations.base;

// --- @/utils (onDummyServiceCreation + chain/config helpers) -----------------
const mockOnDummyServiceCreation = jest.fn();
const mockMatchesAgentConfig = jest.fn();
const MIDDLEWARE_BY_EVM: Record<number, string> = {
  [EvmChainIdMap.Polygon]: MiddlewareChainMap.POLYGON,
  [EvmChainIdMap.Base]: MiddlewareChainMap.BASE,
  [EvmChainIdMap.Gnosis]: MiddlewareChainMap.GNOSIS,
};
const EVM_BY_MIDDLEWARE: Record<string, number> = {
  [MiddlewareChainMap.POLYGON]: EvmChainIdMap.Polygon,
  [MiddlewareChainMap.BASE]: EvmChainIdMap.Base,
  [MiddlewareChainMap.GNOSIS]: EvmChainIdMap.Gnosis,
};

jest.mock('../../utils', () => {
  // The hook now reads `AgentMap`/`SETUP_SCREEN` (values) from `@/constants`,
  // so `constants/index` -> `providers` -> `config/chains` is loaded at
  // import time. `config/chains` calls `parseEther`/`parseUnits` at module
  // eval, so the mocked `@/utils` barrel must expose the real (dependency-free)
  // implementations from `utils/numberFormatters` or module init throws.
  const { parseEther, parseUnits } = jest.requireActual(
    '../../utils/numberFormatters',
  );
  return {
    parseEther,
    parseUnits,
    onDummyServiceCreation: (...args: unknown[]) =>
      mockOnDummyServiceCreation(...args),
    asMiddlewareChain: (chainId: number) => MIDDLEWARE_BY_EVM[chainId],
    asEvmChainId: (middlewareChain: string) =>
      EVM_BY_MIDDLEWARE[middlewareChain],
    matchesAgentConfig: (...args: unknown[]) => mockMatchesAgentConfig(...args),
  };
});

// AGENT_CONFIG is only read to hand the Connect config to `matchesAgentConfig`
// (which is mocked), so any object per agent key suffices.
jest.mock('../../config/agents', () => ({
  AGENT_CONFIG: new Proxy({}, { get: () => ({ servicePublicId: 'connect' }) }),
}));

// --- resolveFundingRoute ----------------------------------------------------
const mockResolveFundingRoute = jest.fn();
jest.mock('../../utils/fundingRoute', () => ({
  resolveFundingRoute: (...args: unknown[]) => mockResolveFundingRoute(...args),
}));

// --- collaborating hooks ----------------------------------------------------
const mockGotoSetup = jest.fn();
const mockRefetchServices = jest.fn();
const mockUpdateSelectedServiceConfigId = jest.fn();
const mockSetDefaultStakingProgramId = jest.fn();
const mockMarkServiceAsNotInitiallyFunded = jest.fn();

// Mutable list of services returned by the mocked `useServices`.
let mockServices: unknown[] = [];

jest.mock('../../hooks/useSetup', () => ({
  useSetup: () => ({ goto: mockGotoSetup }),
}));
jest.mock('../../hooks/useServices', () => ({
  useServices: () => ({
    services: mockServices,
    refetch: mockRefetchServices,
    updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
  }),
}));
jest.mock('../../hooks/useStakingProgram', () => ({
  useStakingProgram: () => ({
    setDefaultStakingProgramId: mockSetDefaultStakingProgramId,
  }),
}));
jest.mock('../../hooks/useIsInitiallyFunded', () => ({
  useIsInitiallyFunded: () => ({
    markServiceAsNotInitiallyFunded: mockMarkServiceAsNotInitiallyFunded,
  }),
}));

const NEW_SERVICE_CONFIG_ID = 'sc-new-connect';

describe('useCreateConnectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServices = [];
    mockOnDummyServiceCreation.mockResolvedValue({
      service_config_id: NEW_SERVICE_CONFIG_ID,
    });
    mockResolveFundingRoute.mockResolvedValue(SETUP_SCREEN.FundYourAgent);
    mockRefetchServices.mockResolvedValue(undefined);
    mockMatchesAgentConfig.mockReturnValue(true);
  });

  it('creates a single-chain no_staking Connect service on the chosen chain', async () => {
    const { result } = renderHook(() => useCreateConnectService());

    await act(async () => {
      await result.current(EvmChainIdMap.Base);
    });

    expect(mockOnDummyServiceCreation).toHaveBeenCalledTimes(1);
    const [stakingProgramId, template] =
      mockOnDummyServiceCreation.mock.calls[0];
    expect(stakingProgramId).toBe('no_staking');
    // home_chain set to the chosen chain, configurations pruned to it only.
    expect(template.home_chain).toBe(MiddlewareChainMap.BASE);
    expect(Object.keys(template.configurations)).toEqual([
      MiddlewareChainMap.BASE,
    ]);
    expect(template.configurations[MiddlewareChainMap.BASE]).toEqual(
      BASE_CONFIG,
    );
  });

  it('prunes configurations to the Polygon chain when Polygon is chosen', async () => {
    const { result } = renderHook(() => useCreateConnectService());

    await act(async () => {
      await result.current(EvmChainIdMap.Polygon);
    });

    const template = mockOnDummyServiceCreation.mock.calls[0][1];
    expect(template.home_chain).toBe(MiddlewareChainMap.POLYGON);
    expect(Object.keys(template.configurations)).toEqual([
      MiddlewareChainMap.POLYGON,
    ]);
  });

  it('selects the new service, marks it unfunded, sets no_staking default and routes to funding', async () => {
    const { result } = renderHook(() => useCreateConnectService());

    await act(async () => {
      await result.current(EvmChainIdMap.Base);
    });

    expect(mockMarkServiceAsNotInitiallyFunded).toHaveBeenCalledWith(
      NEW_SERVICE_CONFIG_ID,
    );
    expect(mockRefetchServices).toHaveBeenCalledTimes(1);
    expect(mockUpdateSelectedServiceConfigId).toHaveBeenCalledWith(
      NEW_SERVICE_CONFIG_ID,
    );
    expect(mockSetDefaultStakingProgramId).toHaveBeenCalledWith('no_staking');
    expect(mockResolveFundingRoute).toHaveBeenCalledWith(NEW_SERVICE_CONFIG_ID);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
  });

  it('routes to the screen resolved by resolveFundingRoute (BalanceCheck)', async () => {
    mockResolveFundingRoute.mockResolvedValue(SETUP_SCREEN.BalanceCheck);
    const { result } = renderHook(() => useCreateConnectService());

    await act(async () => {
      await result.current(EvmChainIdMap.Gnosis);
    });

    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.BalanceCheck);
  });

  it('falls back to FundYourAgent (no re-create) when resolveFundingRoute fails after a successful create', async () => {
    // The create succeeded; only the funding-route network call throws.
    mockResolveFundingRoute.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useCreateConnectService());

    await act(async () => {
      await result.current(EvmChainIdMap.Base);
    });

    // Service was created exactly once and the user still lands on funding —
    // the error must NOT propagate (which would tempt a duplicate create).
    expect(mockOnDummyServiceCreation).toHaveBeenCalledTimes(1);
    expect(mockUpdateSelectedServiceConfigId).toHaveBeenCalledWith(
      NEW_SERVICE_CONFIG_ID,
    );
    expect(mockGotoSetup).toHaveBeenCalledTimes(1);
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
  });

  it('does not create a second service when the chosen chain already has a Connect instance', async () => {
    const EXISTING_SERVICE_CONFIG_ID = 'sc-existing-base-connect';
    mockServices = [
      {
        service_config_id: EXISTING_SERVICE_CONFIG_ID,
        home_chain: MiddlewareChainMap.BASE,
      },
    ];
    const { result } = renderHook(() => useCreateConnectService());

    await act(async () => {
      await result.current(EvmChainIdMap.Base);
    });

    // Occupancy guard: no new service is created for an already-occupied chain.
    expect(mockOnDummyServiceCreation).not.toHaveBeenCalled();
    // Instead the existing instance is selected and routed to funding.
    expect(mockUpdateSelectedServiceConfigId).toHaveBeenCalledWith(
      EXISTING_SERVICE_CONFIG_ID,
    );
    expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.FundYourAgent);
  });
});
