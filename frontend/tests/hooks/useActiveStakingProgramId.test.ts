import { renderHook } from '@testing-library/react';

import { EvmChainId, EvmChainIdMap, REACT_QUERY_KEYS } from '../../constants';
import { StakingProgramId } from '../../constants/stakingProgram';
import {
  createActiveStakingProgramIdQuery,
  useActiveStakingProgramId,
} from '../../hooks/useActiveStakingProgramId';
import { useRewardsHistory } from '../../hooks/useRewardsHistory';
import { AgentConfig } from '../../types/Agent';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/agents', () => ({ AGENT_CONFIG: {} }));
jest.mock('../../hooks/useRewardsHistory', () => ({
  useRewardsHistory: jest.fn(),
}));

const mockUseRewardsHistory = useRewardsHistory as jest.Mock;

// --- Helpers ---

const GNOSIS_CHAIN_ID = EvmChainIdMap.Gnosis;

const mockGetCurrentStakingProgramByServiceId = jest.fn();
const mockGetStakingProgramIdByAddress = jest.fn();

const makeMockServiceApi = () => ({
  getCurrentStakingProgramByServiceId: mockGetCurrentStakingProgramByServiceId,
  getStakingProgramIdByAddress: mockGetStakingProgramIdByAddress,
});

const makeMockAgentConfig = (
  overrides: Partial<AgentConfig> = {},
): AgentConfig =>
  ({
    serviceApi: makeMockServiceApi(),
    evmHomeChainId: GNOSIS_CHAIN_ID,
    ...overrides,
  }) as unknown as AgentConfig;

const setupRewardsHistory = (
  overrides: Partial<ReturnType<typeof useRewardsHistory>> = {},
) => {
  mockUseRewardsHistory.mockReturnValue({
    recentStakingContractAddress: undefined,
    isFetched: false,
    isLoading: false,
    isError: false,
    ...overrides,
  });
};

// --- Tests ---

describe('createActiveStakingProgramIdQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queryKey', () => {
    it('uses REACT_QUERY_KEYS.STAKING_PROGRAM_KEY with chainId and tokenId', () => {
      const result = createActiveStakingProgramIdQuery({
        evmHomeChainId: GNOSIS_CHAIN_ID,
        serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
        serviceApi: makeMockServiceApi() as never,
        isServicesLoaded: true,
        refetchInterval: 5000,
      });
      expect(result.queryKey).toEqual(
        REACT_QUERY_KEYS.STAKING_PROGRAM_KEY(
          GNOSIS_CHAIN_ID,
          DEFAULT_SERVICE_NFT_TOKEN_ID,
        ),
      );
    });
  });

  describe('enabled flag', () => {
    const baseParams = {
      evmHomeChainId: GNOSIS_CHAIN_ID,
      serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      serviceApi: makeMockServiceApi() as never,
      isServicesLoaded: true as const,
      refetchInterval: 5000,
    };

    it('is true when all conditions are met', () => {
      const result = createActiveStakingProgramIdQuery(baseParams);
      expect(result.enabled).toBe(true);
    });

    it('is false when evmHomeChainId is null', () => {
      const result = createActiveStakingProgramIdQuery({
        ...baseParams,
        evmHomeChainId: null as unknown as EvmChainId,
      });
      expect(result.enabled).toBe(false);
    });

    it('is false when evmHomeChainId is undefined', () => {
      const result = createActiveStakingProgramIdQuery({
        ...baseParams,
        evmHomeChainId: undefined as unknown as EvmChainId,
      });
      expect(result.enabled).toBe(false);
    });

    it('is false when isServicesLoaded is false', () => {
      const result = createActiveStakingProgramIdQuery({
        ...baseParams,
        isServicesLoaded: false,
      });
      expect(result.enabled).toBe(false);
    });

    it('is false when isServicesLoaded is null', () => {
      const result = createActiveStakingProgramIdQuery({
        ...baseParams,
        isServicesLoaded: null,
      });
      expect(result.enabled).toBe(false);
    });

    it.each([null, undefined, 0, -1])(
      'is false when serviceNftTokenId is %s',
      (tokenId) => {
        const result = createActiveStakingProgramIdQuery({
          ...baseParams,
          serviceNftTokenId: tokenId as number,
        });
        expect(result.enabled).toBe(false);
      },
    );
  });

  describe('queryFn', () => {
    it('returns null when serviceNftTokenId is invalid', async () => {
      const result = createActiveStakingProgramIdQuery({
        evmHomeChainId: GNOSIS_CHAIN_ID,
        serviceNftTokenId: null,
        serviceApi: makeMockServiceApi() as never,
        isServicesLoaded: true,
        refetchInterval: 5000,
      });
      const value = await result.queryFn();
      expect(value).toBeNull();
      expect(mockGetCurrentStakingProgramByServiceId).not.toHaveBeenCalled();
    });

    it('calls serviceApi.getCurrentStakingProgramByServiceId for valid tokenId', async () => {
      mockGetCurrentStakingProgramByServiceId.mockResolvedValue(
        DEFAULT_STAKING_PROGRAM_ID,
      );
      const result = createActiveStakingProgramIdQuery({
        evmHomeChainId: GNOSIS_CHAIN_ID,
        serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
        serviceApi: makeMockServiceApi() as never,
        isServicesLoaded: true,
        refetchInterval: 5000,
      });
      const value = await result.queryFn();
      expect(value).toBe(DEFAULT_STAKING_PROGRAM_ID);
      expect(mockGetCurrentStakingProgramByServiceId).toHaveBeenCalledWith(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
        GNOSIS_CHAIN_ID,
      );
    });
  });

  describe('refetchInterval', () => {
    it('passes through the provided refetchInterval', () => {
      const result = createActiveStakingProgramIdQuery({
        evmHomeChainId: GNOSIS_CHAIN_ID,
        serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
        serviceApi: makeMockServiceApi() as never,
        isServicesLoaded: true,
        refetchInterval: 12345,
      });
      expect(result.refetchInterval).toBe(12345);
    });
  });
});

describe('useActiveStakingProgramId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupRewardsHistory();
  });

  it('returns null when recentStakingContractAddress is undefined', () => {
    setupRewardsHistory({ recentStakingContractAddress: undefined });
    const agentConfig = makeMockAgentConfig();
    const { result } = renderHook(() => useActiveStakingProgramId(agentConfig));
    expect(result.current.data).toBeNull();
    expect(mockGetStakingProgramIdByAddress).not.toHaveBeenCalled();
  });

  it('calls getStakingProgramIdByAddress when address is present', () => {
    mockGetStakingProgramIdByAddress.mockReturnValue(
      DEFAULT_STAKING_PROGRAM_ID,
    );
    setupRewardsHistory({
      recentStakingContractAddress: DEFAULT_EOA_ADDRESS,
      isFetched: true,
    });
    const agentConfig = makeMockAgentConfig();
    const { result } = renderHook(() => useActiveStakingProgramId(agentConfig));
    expect(result.current.data).toBe(DEFAULT_STAKING_PROGRAM_ID);
    expect(mockGetStakingProgramIdByAddress).toHaveBeenCalledWith(
      GNOSIS_CHAIN_ID,
      DEFAULT_EOA_ADDRESS,
    );
  });

  it('returns null when getStakingProgramIdByAddress returns null', () => {
    mockGetStakingProgramIdByAddress.mockReturnValue(null);
    setupRewardsHistory({
      recentStakingContractAddress: DEFAULT_EOA_ADDRESS,
      isFetched: true,
    });
    const agentConfig = makeMockAgentConfig();
    const { result } = renderHook(() => useActiveStakingProgramId(agentConfig));
    expect(result.current.data).toBeNull();
  });

  it('passes through isFetched, isLoading, and isError from useRewardsHistory', () => {
    setupRewardsHistory({
      isFetched: true,
      isLoading: true,
      isError: true,
    });
    const agentConfig = makeMockAgentConfig();
    const { result } = renderHook(() => useActiveStakingProgramId(agentConfig));
    expect(result.current.isFetched).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(true);
  });

  it('uses evmHomeChainId from the provided agentConfig', () => {
    const baseChainId = EvmChainIdMap.Base;
    mockGetStakingProgramIdByAddress.mockReturnValue(
      'some_program' as StakingProgramId,
    );
    setupRewardsHistory({
      recentStakingContractAddress: DEFAULT_EOA_ADDRESS,
      isFetched: true,
    });
    const agentConfig = makeMockAgentConfig({
      evmHomeChainId: baseChainId,
    } as Partial<AgentConfig>);
    const { result } = renderHook(() => useActiveStakingProgramId(agentConfig));
    expect(mockGetStakingProgramIdByAddress).toHaveBeenCalledWith(
      baseChainId,
      DEFAULT_EOA_ADDRESS,
    );
    expect(result.current.data).toBe('some_program');
  });
});
