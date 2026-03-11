import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import {
  StakingProgramConfig,
  StakingProgramMap,
} from '../../config/stakingPrograms';
import {
  AgentType,
  EvmChainId,
  EvmChainIdMap,
  StakingProgramId,
} from '../../constants';
import { AgentMap } from '../../constants/agent';
import { StakingProgramContext } from '../../context/StakingProgramProvider';
import { useServices } from '../../hooks/useServices';
import { useStakingProgram } from '../../hooks/useStakingProgram';
import {
  DEFAULT_STAKING_CONTRACT_ADDRESS,
  SECOND_STAKING_CONTRACT_ADDRESS,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({ providers: [] }));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

const mockUseServices = useServices as jest.Mock;

// --- Fake staking program configs ---

const FAKE_CHAIN_ID = EvmChainIdMap.Gnosis;

const makeFakeProgram = (
  overrides: Partial<StakingProgramConfig> & { agentsSupported: AgentType[] },
): StakingProgramConfig => {
  const { agentsSupported, deprecated, id, ...rest } = overrides;
  return {
    chainId: FAKE_CHAIN_ID,
    name: 'Fake Program',
    address: DEFAULT_STAKING_CONTRACT_ADDRESS,
    agentsSupported,
    stakingRequirements: {},
    deprecated,
    id: id ?? '0x01',
    ...rest,
  } as StakingProgramConfig;
};

const PROGRAM_A_ID = 'program_a' as StakingProgramId;
const PROGRAM_B_ID = 'program_b' as StakingProgramId;
const PROGRAM_C_ID = 'program_c' as StakingProgramId;
const PROGRAM_D_ID = 'program_d' as StakingProgramId;

const PROGRAM_A = makeFakeProgram({
  name: 'Program A',
  address: DEFAULT_STAKING_CONTRACT_ADDRESS,
  agentsSupported: [AgentMap.PredictTrader],
  id: '0xaa',
});

const PROGRAM_B = makeFakeProgram({
  name: 'Program B',
  address: SECOND_STAKING_CONTRACT_ADDRESS,
  agentsSupported: [AgentMap.PredictTrader, AgentMap.Modius],
  id: '0xbb',
});

const PROGRAM_C = makeFakeProgram({
  name: 'Program C (Modius only)',
  agentsSupported: [AgentMap.Modius],
  deprecated: true,
  id: '0xcc',
});

const PROGRAM_D = makeFakeProgram({
  name: 'Program D (unsupported agent)',
  agentsSupported: [AgentMap.Optimus],
  id: '0xdd',
});

const FAKE_STAKING_PROGRAMS: Record<EvmChainId, StakingProgramMap> = {
  [EvmChainIdMap.Gnosis]: {
    [PROGRAM_A_ID]: PROGRAM_A,
    [PROGRAM_B_ID]: PROGRAM_B,
    [PROGRAM_C_ID]: PROGRAM_C,
    [PROGRAM_D_ID]: PROGRAM_D,
  },
  [EvmChainIdMap.Base]: {},
  [EvmChainIdMap.Mode]: {},
  [EvmChainIdMap.Optimism]: {},
  [EvmChainIdMap.Polygon]: {},
};

// Mock the STAKING_PROGRAMS export from config
jest.mock('../../config/stakingPrograms', () => ({
  get STAKING_PROGRAMS() {
    return FAKE_STAKING_PROGRAMS;
  },
}));

// --- Helpers ---

type StakingProgramContextValue = {
  isActiveStakingProgramLoaded: boolean;
  activeStakingProgramId?: StakingProgramId;
  defaultStakingProgramId?: StakingProgramId;
  selectedStakingProgramId: StakingProgramId | null;
  setDefaultStakingProgramId: (id: StakingProgramId) => void;
  stakingProgramIdToMigrateTo: StakingProgramId | null;
  setStakingProgramIdToMigrateTo: (id: StakingProgramId | null) => void;
};

const DEFAULT_CONTEXT: StakingProgramContextValue = {
  isActiveStakingProgramLoaded: true,
  activeStakingProgramId: undefined,
  defaultStakingProgramId: undefined,
  selectedStakingProgramId: null,
  setDefaultStakingProgramId: jest.fn(),
  stakingProgramIdToMigrateTo: null,
  setStakingProgramIdToMigrateTo: jest.fn(),
};

const createWrapper = (
  contextOverrides: Partial<StakingProgramContextValue> = {},
) => {
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren) =>
    createElement(
      StakingProgramContext.Provider,
      { value: { ...DEFAULT_CONTEXT, ...contextOverrides } },
      children,
    );
};

const setupUseServices = (
  agentType: AgentType = AgentMap.PredictTrader,
  evmHomeChainId: EvmChainId = EvmChainIdMap.Gnosis,
) => {
  mockUseServices.mockReturnValue({
    selectedAgentType: agentType,
    selectedAgentConfig: { evmHomeChainId },
  });
};

// --- Tests ---

describe('useStakingProgram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupUseServices();
  });

  describe('context passthrough values', () => {
    it('returns isActiveStakingProgramLoaded from context', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper({ isActiveStakingProgramLoaded: false }),
      });
      expect(result.current.isActiveStakingProgramLoaded).toBe(false);
    });

    it('returns activeStakingProgramId from context', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper({ activeStakingProgramId: PROGRAM_A_ID }),
      });
      expect(result.current.activeStakingProgramId).toBe(PROGRAM_A_ID);
    });

    it('returns setDefaultStakingProgramId from context', () => {
      const mockSetter = jest.fn();
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper({ setDefaultStakingProgramId: mockSetter }),
      });
      result.current.setDefaultStakingProgramId(PROGRAM_B_ID);
      expect(mockSetter).toHaveBeenCalledWith(PROGRAM_B_ID);
    });

    it('returns stakingProgramIdToMigrateTo and its setter from context', () => {
      const mockSetter = jest.fn();
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper({
          stakingProgramIdToMigrateTo: PROGRAM_B_ID,
          setStakingProgramIdToMigrateTo: mockSetter,
        }),
      });
      expect(result.current.stakingProgramIdToMigrateTo).toBe(PROGRAM_B_ID);
      result.current.setStakingProgramIdToMigrateTo(null);
      expect(mockSetter).toHaveBeenCalledWith(null);
    });
  });

  describe('allAvailableStakingPrograms filtering', () => {
    it('filters programs to only those supporting the selected agent type', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper(),
      });
      // PredictTrader is supported by PROGRAM_A and PROGRAM_B
      expect(result.current.allStakingProgramIds).toEqual(
        expect.arrayContaining([PROGRAM_A_ID, PROGRAM_B_ID]),
      );
      expect(result.current.allStakingProgramIds).not.toContain(PROGRAM_C_ID);
      expect(result.current.allStakingProgramIds).not.toContain(PROGRAM_D_ID);
      expect(result.current.allStakingProgramIds).toHaveLength(2);
    });

    it('includes deprecated programs in available list (filtering is done elsewhere)', () => {
      setupUseServices(AgentMap.Modius);
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper(),
      });
      // Modius is supported by PROGRAM_B and PROGRAM_C (deprecated)
      expect(result.current.allStakingProgramIds).toContain(PROGRAM_B_ID);
      expect(result.current.allStakingProgramIds).toContain(PROGRAM_C_ID);
      expect(result.current.allStakingProgramIds).toHaveLength(2);
    });

    it('returns empty when no programs support the selected agent type', () => {
      setupUseServices(AgentMap.PettAi);
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper(),
      });
      expect(result.current.allStakingProgramIds).toEqual([]);
      expect(result.current.allStakingProgramsMeta).toEqual({});
    });

    it('returns the full config objects in allStakingProgramsMeta', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper(),
      });
      expect(result.current.allStakingProgramsMeta[PROGRAM_A_ID]).toBe(
        PROGRAM_A,
      );
      expect(result.current.allStakingProgramsMeta[PROGRAM_B_ID]).toBe(
        PROGRAM_B,
      );
      expect(
        result.current.allStakingProgramsMeta[PROGRAM_C_ID],
      ).toBeUndefined();
    });
  });

  describe('defaultStakingProgramMeta', () => {
    it('returns the program config when defaultStakingProgramId is set', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper({ defaultStakingProgramId: PROGRAM_A_ID }),
      });
      expect(result.current.defaultStakingProgramId).toBe(PROGRAM_A_ID);
      expect(result.current.defaultStakingProgramMeta).toBe(PROGRAM_A);
    });

    it('returns null when defaultStakingProgramId is undefined', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper({ defaultStakingProgramId: undefined }),
      });
      expect(result.current.defaultStakingProgramMeta).toBeNull();
    });
  });

  describe('selectedStakingProgramMeta', () => {
    it('returns the program config when selectedStakingProgramId is set', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper({ selectedStakingProgramId: PROGRAM_B_ID }),
      });
      expect(result.current.selectedStakingProgramId).toBe(PROGRAM_B_ID);
      expect(result.current.selectedStakingProgramMeta).toBe(PROGRAM_B);
    });

    it('returns null when selectedStakingProgramId is null', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper({ selectedStakingProgramId: null }),
      });
      expect(result.current.selectedStakingProgramMeta).toBeNull();
    });
  });

  describe('chain-awareness', () => {
    it('uses the evmHomeChainId from the selected agent config', () => {
      // Base chain has no programs in our mock
      setupUseServices(AgentMap.PredictTrader, EvmChainIdMap.Base);
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createWrapper(),
      });
      expect(result.current.allStakingProgramIds).toEqual([]);
    });
  });
});
