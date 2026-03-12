import { renderHook } from '@testing-library/react';

import { AgentMap } from '../../constants/agent';
import { EvmChainIdMap } from '../../constants/chains';
import { useInitialFundingRequirements } from '../../hooks/useInitialFundingRequirements';
// Import after all mocks are in place
import { useMasterWalletContext } from '../../hooks/useWallet';
import { DEFAULT_SAFE_ADDRESS } from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

const mockGetMasterSafeOf = jest.fn();

jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(() => ({
    getMasterSafeOf: mockGetMasterSafeOf,
    isFetched: true,
  })),
}));

jest.mock('../../config/agents', () => ({
  AGENT_CONFIG: {
    trader: {
      defaultStakingProgramId: 'pearl_beta_mech_marketplace_3',
      additionalRequirements: {},
    },
    modius: {
      defaultStakingProgramId: 'modius_alpha',
      additionalRequirements: {
        // EvmChainIdMap.Mode = 34443
        34443: { USDC: 10 },
      },
    },
    no_staking: {
      defaultStakingProgramId: undefined,
      additionalRequirements: {},
    },
    // Agent with AGENT_CONFIG but no SERVICE_TEMPLATES entry
    orphan_agent: {
      defaultStakingProgramId: 'some_program',
      additionalRequirements: {},
    },
  },
}));

jest.mock('../../constants/serviceTemplates', () => ({
  SERVICE_TEMPLATES: [
    {
      agentType: 'trader',
      configurations: {
        gnosis: {
          fund_requirements: {
            '0x0000000000000000000000000000000000000000': {
              safe: '1000000000000000000', // 1 native token in wei
              agent: '500000000000000000', // 0.5 native token in wei
            },
          },
        },
      },
    },
    {
      agentType: 'modius',
      configurations: {
        mode: {
          fund_requirements: {
            '0x0000000000000000000000000000000000000000': {
              safe: '1000000000000000000',
              agent: '500000000000000000',
            },
          },
        },
      },
    },
  ],
}));

jest.mock('../../config/chains', () => ({
  CHAIN_CONFIG: {
    // EvmChainIdMap.Gnosis = 100
    100: { safeCreationThreshold: 100000000000000000n }, // 0.1 in wei
    // EvmChainIdMap.Mode = 34443
    34443: { safeCreationThreshold: 100000000000000000n },
  },
}));

jest.mock('../../config/tokens', () => ({
  getNativeTokenSymbol: jest.fn((chainId: number) => {
    if (chainId === 100) return 'XDAI'; // Gnosis
    return 'ETH';
  }),
  NATIVE_TOKEN_CONFIG: {
    100: { XDAI: { decimals: 18, tokenType: 'native', symbol: 'XDAI' } },
    34443: { ETH: { decimals: 18, tokenType: 'native', symbol: 'ETH' } },
  },
  TokenSymbolMap: {
    OLAS: 'OLAS',
    XDAI: 'XDAI',
    ETH: 'ETH',
    USDC: 'USDC',
  },
}));

jest.mock('../../config/stakingPrograms', () => ({
  STAKING_PROGRAMS: {
    100: {
      pearl_beta_mech_marketplace_3: {
        stakingRequirements: { OLAS: 40 },
      },
    },
    34443: {
      modius_alpha: {
        stakingRequirements: { OLAS: 20 },
      },
    },
  },
}));

const mockUseMasterWalletContext =
  useMasterWalletContext as jest.MockedFunction<typeof useMasterWalletContext>;

describe('useInitialFundingRequirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMasterSafeOf.mockReturnValue(undefined);
    mockUseMasterWalletContext.mockReturnValue({
      getMasterSafeOf: mockGetMasterSafeOf,
      isFetched: true,
    });
  });

  it('returns empty object when serviceTemplate is not found', () => {
    // 'orphan_agent' exists in AGENT_CONFIG but has no matching SERVICE_TEMPLATES entry
    const { result } = renderHook(() =>
      useInitialFundingRequirements('orphan_agent' as never),
    );
    expect(result.current).toEqual({});
  });

  it('returns empty object when getMasterSafeOf is nil', () => {
    mockUseMasterWalletContext.mockReturnValue({
      getMasterSafeOf: undefined,
      isFetched: true,
    });

    const { result } = renderHook(() =>
      useInitialFundingRequirements(AgentMap.PredictTrader),
    );
    expect(result.current).toEqual({});
  });

  it('returns empty object when isMasterWalletsFetched is false', () => {
    mockUseMasterWalletContext.mockReturnValue({
      getMasterSafeOf: mockGetMasterSafeOf,
      isFetched: false,
    });

    const { result } = renderHook(() =>
      useInitialFundingRequirements(AgentMap.PredictTrader),
    );
    expect(result.current).toEqual({});
  });

  it('calculates native token correctly with safeCreationThreshold when no master safe', () => {
    mockGetMasterSafeOf.mockReturnValue(undefined);

    const { result } = renderHook(() =>
      useInitialFundingRequirements(AgentMap.PredictTrader),
    );

    // monthlyGas = 1e18 + 0.5e18 = 1.5e18
    // safeCreationThreshold = 0.1e18 (no master safe exists)
    // agentDeploymentGas = 2n
    // total = (1.5e18 + 0.1e18 + 2) / 1e18 = 1.6
    const gnosisResult = result.current[EvmChainIdMap.Gnosis];
    expect(gnosisResult).toBeDefined();
    expect(gnosisResult.XDAI).toBe(1.6);
  });

  it('uses 0 for safeCreationThreshold when master safe exists', () => {
    mockGetMasterSafeOf.mockReturnValue({
      address: DEFAULT_SAFE_ADDRESS,
      evmChainId: EvmChainIdMap.Gnosis,
      type: 'Safe',
      owner: 'Master',
    });

    const { result } = renderHook(() =>
      useInitialFundingRequirements(AgentMap.PredictTrader),
    );

    // monthlyGas = 1.5e18
    // safeCreationThreshold = 0 (master safe exists)
    // agentDeploymentGas = 2n
    // total = (1.5e18 + 0 + 2) / 1e18 = 1.5
    const gnosisResult = result.current[EvmChainIdMap.Gnosis];
    expect(gnosisResult).toBeDefined();
    expect(gnosisResult.XDAI).toBe(1.5);
  });

  it('includes OLAS staking requirement from STAKING_PROGRAMS', () => {
    const { result } = renderHook(() =>
      useInitialFundingRequirements(AgentMap.PredictTrader),
    );

    const gnosisResult = result.current[EvmChainIdMap.Gnosis];
    expect(gnosisResult.OLAS).toBe(40);
  });

  it('includes additional requirements from AGENT_CONFIG', () => {
    const { result } = renderHook(() =>
      useInitialFundingRequirements(AgentMap.Modius),
    );

    const modeResult = result.current[EvmChainIdMap.Mode];
    expect(modeResult).toBeDefined();
    expect(modeResult.USDC).toBe(10);
    expect(modeResult.OLAS).toBe(20);
  });

  it('skips chain when no stakingProgramId', () => {
    const { result } = renderHook(() =>
      useInitialFundingRequirements('no_staking' as never),
    );
    expect(result.current).toEqual({});
  });

  it('returns 0 for OLAS when stakingRequirements is missing', () => {
    // Override the staking program to have no OLAS requirement
    const stakingMock = jest.requireMock('../../config/stakingPrograms');
    const originalStakingReqs =
      stakingMock.STAKING_PROGRAMS[100].pearl_beta_mech_marketplace_3;
    stakingMock.STAKING_PROGRAMS[100].pearl_beta_mech_marketplace_3 = {
      stakingRequirements: {},
    };

    const { result } = renderHook(() =>
      useInitialFundingRequirements(AgentMap.PredictTrader),
    );

    const gnosisResult = result.current[EvmChainIdMap.Gnosis];
    expect(gnosisResult.OLAS).toBe(0);

    // Restore
    stakingMock.STAKING_PROGRAMS[100].pearl_beta_mech_marketplace_3 =
      originalStakingReqs;
  });
});
