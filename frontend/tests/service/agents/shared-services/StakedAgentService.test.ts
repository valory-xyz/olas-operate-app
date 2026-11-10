import { ethers } from 'ethers';
import { ContractCall, Provider as MulticallProvider } from 'ethers-multicall';

import { StakingProgramConfig } from '../../../../config/stakingPrograms';
import { EvmChainId, EvmChainIdMap } from '../../../../constants/chains';
import { CONTRACT_TYPE } from '../../../../constants/contract';
import { SERVICE_REGISTRY_L2_SERVICE_STATE } from '../../../../constants/serviceRegistryL2ServiceState';
import { StakingProgramId } from '../../../../constants/stakingProgram';
import {
  ONE_YEAR,
  StakedAgentService,
} from '../../../../service/agents/shared-services/StakedAgentService';
import {
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_CONTRACT_ADDRESS,
  SECOND_STAKING_CONTRACT_ADDRESS,
} from '../../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../../constants/providers', () => ({ PROVIDERS: {} }));

// ── Mock program IDs ──
const PROGRAM_A = 'program_a' as StakingProgramId;
const PROGRAM_B = 'program_b' as StakingProgramId;
const PROGRAM_C = 'program_c' as StakingProgramId;

const MOCK_CHAIN_ID = EvmChainIdMap.Gnosis;

// ── Mock staking program contracts ──
const mockGetStakingStateA = jest.fn();
const mockGetStakingStateB = jest.fn();

const makeStubConfig = (
  overrides: Record<string, unknown>,
): StakingProgramConfig =>
  ({
    chainId: MOCK_CHAIN_ID,
    deprecated: false,
    name: 'Stub',
    agentsSupported: [],
    ...overrides,
  }) as unknown as StakingProgramConfig;

const MOCK_STAKING_PROGRAMS: Record<
  EvmChainId,
  Record<string, StakingProgramConfig>
> = {
  [EvmChainIdMap.Gnosis]: {
    [PROGRAM_A]: makeStubConfig({
      name: 'Program A',
      address: DEFAULT_STAKING_CONTRACT_ADDRESS,
      contract: { getStakingState: mockGetStakingStateA },
    }),
    [PROGRAM_B]: makeStubConfig({
      name: 'Program B',
      address: SECOND_STAKING_CONTRACT_ADDRESS,
      contract: { getStakingState: mockGetStakingStateB },
    }),
    // PROGRAM_C has a different chainId so it should be filtered out
    [PROGRAM_C]: makeStubConfig({
      name: 'Program C',
      address: '0x5555555555555555555555555555555555555555',
      chainId: EvmChainIdMap.Base as EvmChainId,
      contract: { getStakingState: jest.fn() },
    }),
  },
  [EvmChainIdMap.Base]: {},
  [EvmChainIdMap.Mode]: {},
  [EvmChainIdMap.Optimism]: {},
  [EvmChainIdMap.Robinhood]: {},
  [EvmChainIdMap.Polygon]: {},
};

jest.mock('../../../../config/stakingPrograms', () => ({
  get STAKING_PROGRAMS() {
    return MOCK_STAKING_PROGRAMS;
  },
}));

// ── Mock multicall provider ──
const mockMulticallAll = jest.fn();

jest.mock('../../../../constants', () => {
  const actual = jest.requireActual('../../../../constants');
  return {
    ...actual,
    get PROVIDERS() {
      return new Proxy(
        {},
        {
          get: () => ({
            multicallProvider: { all: mockMulticallAll },
          }),
        },
      );
    },
  };
});

// ── Mock OLAS contracts ──
const mockGetOperatorBalance = jest.fn();
const mockMapServiceIdTokenDeposit = jest.fn();
const mockMapServices = jest.fn();

jest.mock('../../../../config/olasContracts', () => ({
  get OLAS_CONTRACTS() {
    return {
      [EvmChainIdMap.Gnosis]: {
        [CONTRACT_TYPE.ServiceRegistryTokenUtility]: {
          getOperatorBalance: mockGetOperatorBalance,
          mapServiceIdTokenDeposit: mockMapServiceIdTokenDeposit,
        },
        [CONTRACT_TYPE.ServiceRegistryL2]: {
          mapServices: mockMapServices,
        },
      },
    };
  },
}));

describe('StakedAgentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ONE_YEAR constant', () => {
    it('equals 31536000 seconds (365 days)', () => {
      expect(ONE_YEAR).toBe(31_536_000);
    });
  });

  describe('getCurrentStakingProgramByServiceId', () => {
    it('returns undefined for serviceNftTokenId of 0', async () => {
      const result =
        await StakedAgentService.getCurrentStakingProgramByServiceId(
          0,
          MOCK_CHAIN_ID,
        );
      expect(result).toBeUndefined();
      expect(mockMulticallAll).not.toHaveBeenCalled();
    });

    it('returns undefined for negative serviceNftTokenId', async () => {
      const result =
        await StakedAgentService.getCurrentStakingProgramByServiceId(
          -1,
          MOCK_CHAIN_ID,
        );
      expect(result).toBeUndefined();
      expect(mockMulticallAll).not.toHaveBeenCalled();
    });

    it('returns undefined for falsy evmChainId', async () => {
      const result =
        await StakedAgentService.getCurrentStakingProgramByServiceId(
          DEFAULT_SERVICE_NFT_TOKEN_ID,
          0 as EvmChainId,
        );
      expect(result).toBeUndefined();
      expect(mockMulticallAll).not.toHaveBeenCalled();
    });

    it('returns the active staking program ID when one has a truthy state', async () => {
      // Simulate getStakingState calls — the actual calls just create
      // call objects; multicallProvider.all resolves them.
      mockGetStakingStateA.mockReturnValue('call_a');
      mockGetStakingStateB.mockReturnValue('call_b');
      // PROGRAM_A (index 0) is inactive (0), PROGRAM_B (index 1) is active (1)
      // Note: PROGRAM_C is filtered out because its chainId !== MOCK_CHAIN_ID
      mockMulticallAll.mockResolvedValue([0, 1]);

      const result =
        await StakedAgentService.getCurrentStakingProgramByServiceId(
          DEFAULT_SERVICE_NFT_TOKEN_ID,
          MOCK_CHAIN_ID,
        );
      expect(result).toBe(PROGRAM_B);
      expect(mockGetStakingStateA).toHaveBeenCalledWith(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
      );
      expect(mockGetStakingStateB).toHaveBeenCalledWith(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
      );
    });

    it('returns null when no program has a truthy staking state', async () => {
      mockGetStakingStateA.mockReturnValue('call_a');
      mockGetStakingStateB.mockReturnValue('call_b');
      mockMulticallAll.mockResolvedValue([0, 0]);

      const result =
        await StakedAgentService.getCurrentStakingProgramByServiceId(
          DEFAULT_SERVICE_NFT_TOKEN_ID,
          MOCK_CHAIN_ID,
        );
      expect(result).toBeNull();
    });

    it('returns null when multicall throws an error', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockGetStakingStateA.mockReturnValue('call_a');
      mockGetStakingStateB.mockReturnValue('call_b');
      mockMulticallAll.mockRejectedValue(new Error('RPC failure'));

      const result =
        await StakedAgentService.getCurrentStakingProgramByServiceId(
          DEFAULT_SERVICE_NFT_TOKEN_ID,
          MOCK_CHAIN_ID,
        );
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error while getting current staking program',
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it('filters out programs whose chainId does not match evmChainId', async () => {
      mockGetStakingStateA.mockReturnValue('call_a');
      mockGetStakingStateB.mockReturnValue('call_b');
      // Only 2 calls should be made (PROGRAM_A and PROGRAM_B), not 3
      mockMulticallAll.mockResolvedValue([0, 0]);

      await StakedAgentService.getCurrentStakingProgramByServiceId(
        DEFAULT_SERVICE_NFT_TOKEN_ID,
        MOCK_CHAIN_ID,
      );

      // The multicall should receive exactly 2 calls (PROGRAM_C filtered out)
      expect(mockMulticallAll).toHaveBeenCalledWith(['call_a', 'call_b']);
    });
  });

  describe('getServiceRegistryInfo', () => {
    const SERVICE_ID = 42;

    it('returns bondValue, depositValue, and serviceState from multicall', async () => {
      const operatorBalance = ethers.utils.parseUnits('5.0', 18);
      const tokenDeposit = [
        ethers.constants.AddressZero,
        ethers.utils.parseUnits('10.0', 18),
      ];
      const serviceResponse = {
        state: SERVICE_REGISTRY_L2_SERVICE_STATE.Deployed,
      };

      mockGetOperatorBalance.mockReturnValue('opBalanceCall');
      mockMapServiceIdTokenDeposit.mockReturnValue('tokenDepositCall');
      mockMapServices.mockReturnValue('mapServicesCall');

      mockMulticallAll.mockResolvedValue([
        operatorBalance,
        tokenDeposit,
        serviceResponse,
      ]);

      const result = await StakedAgentService.getServiceRegistryInfo(
        DEFAULT_SAFE_ADDRESS,
        SERVICE_ID,
        MOCK_CHAIN_ID,
      );

      expect(result).toEqual({
        bondValue: 5.0,
        depositValue: 10.0,
        serviceState: SERVICE_REGISTRY_L2_SERVICE_STATE.Deployed,
      });
      expect(mockGetOperatorBalance).toHaveBeenCalledWith(
        DEFAULT_SAFE_ADDRESS,
        SERVICE_ID,
      );
      expect(mockMapServiceIdTokenDeposit).toHaveBeenCalledWith(SERVICE_ID);
      expect(mockMapServices).toHaveBeenCalledWith(SERVICE_ID);
    });

    it('throws "Chain not supported" for an unknown chain', async () => {
      const unknownChainId = 999 as EvmChainId;
      await expect(
        StakedAgentService.getServiceRegistryInfo(
          DEFAULT_SAFE_ADDRESS,
          SERVICE_ID,
          unknownChainId,
        ),
      ).rejects.toThrow('Chain not supported');
    });
  });

  describe('getStakingProgramIdByAddress', () => {
    it('returns the program ID when the address matches', () => {
      const result = StakedAgentService.getStakingProgramIdByAddress(
        MOCK_CHAIN_ID,
        DEFAULT_STAKING_CONTRACT_ADDRESS,
      );
      expect(result).toBe(PROGRAM_A);
    });

    it('matches addresses case-insensitively', () => {
      const result = StakedAgentService.getStakingProgramIdByAddress(
        MOCK_CHAIN_ID,
        DEFAULT_STAKING_CONTRACT_ADDRESS.toUpperCase() as `0x${string}`,
      );
      expect(result).toBe(PROGRAM_A);
    });

    it('returns null when no program matches the address', () => {
      const result = StakedAgentService.getStakingProgramIdByAddress(
        MOCK_CHAIN_ID,
        '0x9999999999999999999999999999999999999999',
      );
      expect(result).toBeNull();
    });

    it('returns null for a chain with no staking programs', () => {
      const result = StakedAgentService.getStakingProgramIdByAddress(
        EvmChainIdMap.Base,
        DEFAULT_STAKING_CONTRACT_ADDRESS,
      );
      expect(result).toBeNull();
    });
  });

  describe('getCurrentStakingProgramByServiceId – activeStakingProgramId fallback', () => {
    it('returns null when the active entry index is out of bounds', async () => {
      mockGetStakingStateA.mockReturnValue('call_a');
      mockGetStakingStateB.mockReturnValue('call_b');
      // Both programs resolve to false, but we manipulate the
      // findIndex result by having an extra truthy element that
      // does not correspond to a staking program entry.
      // Simulate: multicall returns [0, 0, 1] where index 2 has no matching entry
      mockMulticallAll.mockResolvedValue([0, 0, 1]);

      const result =
        await StakedAgentService.getCurrentStakingProgramByServiceId(
          DEFAULT_SERVICE_NFT_TOKEN_ID,
          MOCK_CHAIN_ID,
        );
      // activeStakingProgramIndex = 2, but stakingProgramEntries only has 2 entries (0,1)
      // so stakingProgramEntries[2]?.[0] is undefined => returns null
      expect(result).toBeNull();
    });
  });
});

describe('StakedAgentService.readWithBaseline', () => {
  const ELIGIBILITY_CALLS = [
    'getServiceInfo',
    'tsCheckpoint',
  ] as unknown as ContractCall[];
  const ELIGIBILITY_READS = [{ 2: [5, 10] }, 1_710_000_000];

  const mockRebaselinePending = jest.fn(() => 'rebaselinePending');
  const mockMapServiceIdBaselineMissing = jest.fn(
    () => 'mapServiceIdBaselineMissing',
  );
  const provider = { all: mockMulticallAll } as unknown as MulticallProvider;

  const makeProgram = (stakingVersion?: '0.4') =>
    makeStubConfig({
      stakingVersion,
      contract: {
        rebaselinePending: mockRebaselinePending,
        mapServiceIdBaselineMissing: mockMapServiceIdBaselineMissing,
      },
    });

  const read = (stakingVersion?: '0.4') =>
    StakedAgentService.readWithBaseline(
      provider,
      makeProgram(stakingVersion),
      DEFAULT_SERVICE_NFT_TOKEN_ID,
      ELIGIBILITY_CALLS,
    );

  beforeEach(() => {
    mockMulticallAll.mockReset();
    mockRebaselinePending.mockClear();
    mockMapServiceIdBaselineMissing.mockClear();
  });

  it('older programme: makes only the eligibility calls and is never awaiting a baseline', async () => {
    mockMulticallAll.mockResolvedValueOnce(ELIGIBILITY_READS);

    const result = await read();

    expect(mockMulticallAll).toHaveBeenCalledWith(ELIGIBILITY_CALLS);
    expect(mockRebaselinePending).not.toHaveBeenCalled();
    expect(mockMapServiceIdBaselineMissing).not.toHaveBeenCalled();
    expect(result).toEqual({
      reads: ELIGIBILITY_READS,
      isAwaitingBaseline: false,
    });
  });

  it('v0.4 programme: adds both baseline reads to the same multicall', async () => {
    mockMulticallAll.mockResolvedValueOnce([
      ...ELIGIBILITY_READS,
      false,
      false,
    ]);

    await read('0.4');

    expect(mockMulticallAll).toHaveBeenCalledTimes(1);
    expect(mockMulticallAll).toHaveBeenCalledWith([
      ...ELIGIBILITY_CALLS,
      'rebaselinePending',
      'mapServiceIdBaselineMissing',
    ]);
    expect(mockMapServiceIdBaselineMissing).toHaveBeenCalledWith(
      DEFAULT_SERVICE_NFT_TOKEN_ID,
    );
  });

  it.each([
    ['the counter read failed (baseline missing)', false, true, true],
    ['a refill left a rebaseline pending', true, false, true],
    ['the baseline recovered (both flags clear)', false, false, false],
  ])(
    'v0.4 programme: when %s (rebaselinePending=%s, baselineMissing=%s), isAwaitingBaseline is %s',
    async (_case, rebaselinePending, baselineMissing, expected) => {
      mockMulticallAll.mockResolvedValueOnce([
        ...ELIGIBILITY_READS,
        rebaselinePending,
        baselineMissing,
      ]);

      const result = await read('0.4');

      expect(result).toEqual({
        reads: ELIGIBILITY_READS,
        isAwaitingBaseline: expected,
      });
    },
  );

  it('v0.4 programme: an RPC/multicall failure rejects instead of assuming both flags false', async () => {
    mockMulticallAll.mockRejectedValueOnce(new Error('multicall failed'));

    await expect(read('0.4')).rejects.toThrow('multicall failed');
  });

  it.each([
    ['missing', [...ELIGIBILITY_READS]],
    ['non-boolean', [...ELIGIBILITY_READS, undefined, false]],
  ])(
    'v0.4 programme: rejects %s baseline reads instead of reading them as false',
    async (_case, response) => {
      mockMulticallAll.mockResolvedValueOnce(response);

      await expect(read('0.4')).rejects.toThrow(
        'Unexpected StakingToken baseline reads',
      );
    },
  );
});
