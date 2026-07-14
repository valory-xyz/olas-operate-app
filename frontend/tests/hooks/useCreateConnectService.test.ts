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

// --- @/utils (onDummyServiceCreation + asMiddlewareChain) --------------------
const mockOnDummyServiceCreation = jest.fn();
const MIDDLEWARE_BY_EVM: Record<number, string> = {
  [EvmChainIdMap.Polygon]: MiddlewareChainMap.POLYGON,
  [EvmChainIdMap.Base]: MiddlewareChainMap.BASE,
  [EvmChainIdMap.Gnosis]: MiddlewareChainMap.GNOSIS,
};

jest.mock('../../utils', () => ({
  onDummyServiceCreation: (...args: unknown[]) =>
    mockOnDummyServiceCreation(...args),
  asMiddlewareChain: (chainId: number) => MIDDLEWARE_BY_EVM[chainId],
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

jest.mock('../../hooks/useSetup', () => ({
  useSetup: () => ({ goto: mockGotoSetup }),
}));
jest.mock('../../hooks/useServices', () => ({
  useServices: () => ({
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
    mockOnDummyServiceCreation.mockResolvedValue({
      service_config_id: NEW_SERVICE_CONFIG_ID,
    });
    mockResolveFundingRoute.mockResolvedValue(SETUP_SCREEN.FundYourAgent);
    mockRefetchServices.mockResolvedValue(undefined);
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
});
