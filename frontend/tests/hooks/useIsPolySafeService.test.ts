import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';

import { StakingProgramConfig } from '../../config/stakingPrograms';
import { AgentMap } from '../../constants/agent';
import {
  EvmChainId,
  EvmChainIdMap,
  MiddlewareChainMap,
} from '../../constants/chains';
import {
  POLY_SAFE_PROXY_CODEHASH,
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '../../constants/stakingProgram';
import { useIsPolySafeService } from '../../hooks/useIsPolySafeService';
import { useServices } from '../../hooks/useServices';
import { useStakingProgram } from '../../hooks/useStakingProgram';
import { Address } from '../../types/Address';
import {
  makeChainConfig,
  makeService,
  makeStakingProgramConfig,
} from '../helpers/factories';
import { createQueryClientWrapper } from '../helpers/queryClient';

const mockGetCode = jest.fn();

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({
  PROVIDERS: {
    137: { provider: { getCode: (address: string) => mockGetCode(address) } },
    100: { provider: { getCode: (address: string) => mockGetCode(address) } },
  },
}));
jest.mock('../../config/providers', () => ({ providers: [] }));

jest.mock('../../hooks/useServices', () => ({ useServices: jest.fn() }));
jest.mock('../../hooks/useStakingProgram', () => ({
  useStakingProgram: jest.fn(),
}));

const POLY_SAFE_PROGRAM = STAKING_PROGRAM_IDS.PolystratI;
const STANDARD_SAFE_PROGRAM = 'polystrat_standard_safe' as StakingProgramId;

const MOCK_STAKING_PROGRAMS: Record<
  EvmChainId,
  Record<string, StakingProgramConfig>
> = {
  [EvmChainIdMap.Gnosis]: {
    [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3]: makeStakingProgramConfig(),
  },
  [EvmChainIdMap.Base]: {},
  [EvmChainIdMap.Mode]: {},
  [EvmChainIdMap.Optimism]: {},
  [EvmChainIdMap.Polygon]: {
    [POLY_SAFE_PROGRAM]: makeStakingProgramConfig({
      chainId: EvmChainIdMap.Polygon,
      agentsSupported: [AgentMap.Polystrat],
      requiresPolySafe: true,
    }),
    [STANDARD_SAFE_PROGRAM]: makeStakingProgramConfig({
      chainId: EvmChainIdMap.Polygon,
      agentsSupported: [AgentMap.Polystrat],
    }),
  },
};

jest.mock('../../config/stakingPrograms', () => ({
  get STAKING_PROGRAMS() {
    return MOCK_STAKING_PROGRAMS;
  },
}));

/**
 * Runtime bytecode of a real PolySafe proxy on Polygon (multisig of Polystrat
 * service #37, staked in `polystrat_i`). keccak256 of it must equal
 * `POLY_SAFE_PROXY_CODEHASH`.
 */
const POLY_SAFE_PROXY_BYTECODE =
  '0x6080604052600080546001600160a01b0316813563530ca43760e11b1415602857808252602082f35b3682833781823684845af490503d82833e806041573d82fd5b503d81f3fea264697066735822122015938e3bf2c49f5df5c1b7f9569fa85cc5d6f3074bb258a2dc0c7e299bc9e33664736f6c63430008040033';
const STANDARD_SAFE_PROXY_BYTECODE = '0x608060405260006001';

const MULTISIG = '0xD8da8f33e151E9Fb2D2Ed02BC806c4fABe248dFc' as Address;

const mockUseServices = useServices as jest.Mock;
const mockUseStakingProgram = useStakingProgram as jest.Mock;

const setupMocks = ({
  evmHomeChainId = EvmChainIdMap.Polygon as EvmChainId,
  hasService = true,
  hasMultisig = true,
  storedStakingProgramId = STANDARD_SAFE_PROGRAM,
  activeStakingProgramId = null as StakingProgramId | null,
  isActiveStakingProgramLoaded = true,
}: {
  evmHomeChainId?: EvmChainId;
  hasService?: boolean;
  hasMultisig?: boolean;
  storedStakingProgramId?: StakingProgramId;
  activeStakingProgramId?: StakingProgramId | null;
  isActiveStakingProgramLoaded?: boolean;
} = {}) => {
  mockUseServices.mockReturnValue({
    selectedAgentConfig: { evmHomeChainId },
    selectedService: hasService
      ? makeService({
          home_chain: MiddlewareChainMap.POLYGON,
          chain_configs: makeChainConfig(MiddlewareChainMap.POLYGON, {
            multisig: hasMultisig ? MULTISIG : undefined,
            staking_program_id: storedStakingProgramId,
          }),
        })
      : undefined,
  });
  mockUseStakingProgram.mockReturnValue({
    activeStakingProgramId,
    isActiveStakingProgramLoaded,
  });
};

const renderIsPolySafe = () =>
  renderHook(() => useIsPolySafeService(), {
    wrapper: createQueryClientWrapper(),
  });

describe('useIsPolySafeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCode.mockResolvedValue(STANDARD_SAFE_PROXY_BYTECODE);
  });

  it('sanity: the fixture bytecode hashes to POLY_SAFE_PROXY_CODEHASH', () => {
    expect(ethers.utils.keccak256(POLY_SAFE_PROXY_BYTECODE)).toBe(
      POLY_SAFE_PROXY_CODEHASH,
    );
  });

  it('returns false without an RPC call on chains that have no PolySafe contracts', () => {
    setupMocks({ evmHomeChainId: EvmChainIdMap.Gnosis });

    const { result } = renderIsPolySafe();
    expect(result.current).toEqual({
      isPolySafeService: false,
      isMultisigTypeLoaded: true,
    });
    expect(mockGetCode).not.toHaveBeenCalled();
  });

  it('returns true without an RPC call when the service stores a PolySafe program', () => {
    setupMocks({ storedStakingProgramId: POLY_SAFE_PROGRAM });

    const { result } = renderIsPolySafe();
    expect(result.current).toEqual({
      isPolySafeService: true,
      isMultisigTypeLoaded: true,
    });
    expect(mockGetCode).not.toHaveBeenCalled();
  });

  it('returns true without an RPC call when the on-chain active program is a PolySafe program', () => {
    setupMocks({ activeStakingProgramId: POLY_SAFE_PROGRAM });

    const { result } = renderIsPolySafe();
    expect(result.current.isPolySafeService).toBe(true);
    expect(result.current.isMultisigTypeLoaded).toBe(true);
    expect(mockGetCode).not.toHaveBeenCalled();
  });

  it('returns false (loaded) for a service that is not deployed yet', () => {
    setupMocks({ hasMultisig: false });

    const { result } = renderIsPolySafe();
    expect(result.current).toEqual({
      isPolySafeService: false,
      isMultisigTypeLoaded: true,
    });
    expect(mockGetCode).not.toHaveBeenCalled();
  });

  it('returns false (loaded) when there is no service at all', () => {
    setupMocks({ hasService: false });

    const { result } = renderIsPolySafe();
    expect(result.current).toEqual({
      isPolySafeService: false,
      isMultisigTypeLoaded: true,
    });
    expect(mockGetCode).not.toHaveBeenCalled();
  });

  it('stays unloaded until the active staking program is known', () => {
    setupMocks({ isActiveStakingProgramLoaded: false });

    const { result } = renderIsPolySafe();
    expect(result.current.isMultisigTypeLoaded).toBe(false);
    expect(mockGetCode).not.toHaveBeenCalled();
  });

  it('detects a PolySafe multisig from its bytecode', async () => {
    mockGetCode.mockResolvedValue(POLY_SAFE_PROXY_BYTECODE);
    setupMocks();

    const { result } = renderIsPolySafe();
    expect(result.current.isMultisigTypeLoaded).toBe(false);

    await waitFor(() => expect(result.current.isMultisigTypeLoaded).toBe(true));
    expect(result.current.isPolySafeService).toBe(true);
    expect(mockGetCode).toHaveBeenCalledWith(MULTISIG);
  });

  it('detects a standard Safe multisig from its bytecode', async () => {
    mockGetCode.mockResolvedValue(STANDARD_SAFE_PROXY_BYTECODE);
    setupMocks();

    const { result } = renderIsPolySafe();
    await waitFor(() => expect(result.current.isMultisigTypeLoaded).toBe(true));
    expect(result.current.isPolySafeService).toBe(false);
  });

  it('falls back to standard Safe (loaded) when the RPC call fails', async () => {
    mockGetCode.mockRejectedValue(new Error('rpc down'));
    setupMocks();

    const { result } = renderIsPolySafe();
    await waitFor(() => expect(result.current.isMultisigTypeLoaded).toBe(true));
    expect(result.current.isPolySafeService).toBe(false);
  });
});
