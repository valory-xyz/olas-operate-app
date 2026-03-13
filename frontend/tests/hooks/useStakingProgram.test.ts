import { renderHook } from '@testing-library/react';

import { StakingProgramMap } from '../../config/stakingPrograms';
import {
  AgentType,
  EvmChainId,
  EvmChainIdMap,
  STAKING_PROGRAM_IDS,
} from '../../constants';
import { AgentMap } from '../../constants/agent';
import { useServices } from '../../hooks/useServices';
import { useStakingProgram } from '../../hooks/useStakingProgram';
import { createStakingProgramContextWrapper } from '../helpers/contextDefaults';
import {
  makeStakingProgramConfig,
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

// --- Staking program configs using real STAKING_PROGRAM_IDS ---

const MARKETPLACE_3_ID = STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3;
const MARKETPLACE_4_ID = STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4;
const BETA_5_ID = STAKING_PROGRAM_IDS.PearlBeta5;
const OPTIMUS_ALPHA_2_ID = STAKING_PROGRAM_IDS.OptimusAlpha2;

const MARKETPLACE_3_CONFIG = makeStakingProgramConfig({
  name: 'Pearl Beta Mech Marketplace III',
  agentsSupported: [AgentMap.PredictTrader],
});

const MARKETPLACE_4_CONFIG = makeStakingProgramConfig({
  name: 'Pearl Beta Mech Marketplace IV',
  address: SECOND_STAKING_CONTRACT_ADDRESS,
  agentsSupported: [AgentMap.PredictTrader, AgentMap.Modius],
});

const BETA_5_CONFIG = makeStakingProgramConfig({
  name: 'Pearl Beta 5',
  agentsSupported: [AgentMap.Modius],
  deprecated: true,
});

const OPTIMUS_ALPHA_2_CONFIG = makeStakingProgramConfig({
  name: 'Optimus Alpha 2',
  agentsSupported: [AgentMap.Optimus],
});

const MOCK_STAKING_PROGRAMS: Record<EvmChainId, StakingProgramMap> = {
  [EvmChainIdMap.Gnosis]: {
    [MARKETPLACE_3_ID]: MARKETPLACE_3_CONFIG,
    [MARKETPLACE_4_ID]: MARKETPLACE_4_CONFIG,
    [BETA_5_ID]: BETA_5_CONFIG,
    [OPTIMUS_ALPHA_2_ID]: OPTIMUS_ALPHA_2_CONFIG,
  },
  [EvmChainIdMap.Base]: {},
  [EvmChainIdMap.Mode]: {},
  [EvmChainIdMap.Optimism]: {},
  [EvmChainIdMap.Polygon]: {},
};

// Mock the STAKING_PROGRAMS export from config
jest.mock('../../config/stakingPrograms', () => ({
  get STAKING_PROGRAMS() {
    return MOCK_STAKING_PROGRAMS;
  },
}));

// --- Helpers ---

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
        wrapper: createStakingProgramContextWrapper({
          isActiveStakingProgramLoaded: false,
        }),
      });
      expect(result.current.isActiveStakingProgramLoaded).toBe(false);
    });

    it('returns activeStakingProgramId from context', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper({
          activeStakingProgramId: MARKETPLACE_3_ID,
        }),
      });
      expect(result.current.activeStakingProgramId).toBe(MARKETPLACE_3_ID);
    });

    it('returns setDefaultStakingProgramId from context', () => {
      const mockSetter = jest.fn();
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper({
          setDefaultStakingProgramId: mockSetter,
        }),
      });
      result.current.setDefaultStakingProgramId(MARKETPLACE_4_ID);
      expect(mockSetter).toHaveBeenCalledWith(MARKETPLACE_4_ID);
    });

    it('returns stakingProgramIdToMigrateTo and its setter from context', () => {
      const mockSetter = jest.fn();
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper({
          stakingProgramIdToMigrateTo: MARKETPLACE_4_ID,
          setStakingProgramIdToMigrateTo: mockSetter,
        }),
      });
      expect(result.current.stakingProgramIdToMigrateTo).toBe(MARKETPLACE_4_ID);
      result.current.setStakingProgramIdToMigrateTo(null);
      expect(mockSetter).toHaveBeenCalledWith(null);
    });
  });

  describe('allAvailableStakingPrograms filtering', () => {
    it('filters programs to only those supporting the selected agent type', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper(),
      });
      // PredictTrader is supported by MARKETPLACE_3 and MARKETPLACE_4
      expect(result.current.allStakingProgramIds).toEqual(
        expect.arrayContaining([MARKETPLACE_3_ID, MARKETPLACE_4_ID]),
      );
      expect(result.current.allStakingProgramIds).not.toContain(BETA_5_ID);
      expect(result.current.allStakingProgramIds).not.toContain(
        OPTIMUS_ALPHA_2_ID,
      );
      expect(result.current.allStakingProgramIds).toHaveLength(2);
    });

    it('includes deprecated programs in available list (filtering is done elsewhere)', () => {
      setupUseServices(AgentMap.Modius);
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper(),
      });
      // Modius is supported by MARKETPLACE_4 and BETA_5 (deprecated)
      expect(result.current.allStakingProgramIds).toContain(MARKETPLACE_4_ID);
      expect(result.current.allStakingProgramIds).toContain(BETA_5_ID);
      expect(result.current.allStakingProgramIds).toHaveLength(2);
    });

    it('returns empty when no programs support the selected agent type', () => {
      setupUseServices(AgentMap.PettAi);
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper(),
      });
      expect(result.current.allStakingProgramIds).toEqual([]);
      expect(result.current.allStakingProgramsMeta).toEqual({});
    });

    it('returns the full config objects in allStakingProgramsMeta', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper(),
      });
      expect(result.current.allStakingProgramsMeta[MARKETPLACE_3_ID]).toBe(
        MARKETPLACE_3_CONFIG,
      );
      expect(result.current.allStakingProgramsMeta[MARKETPLACE_4_ID]).toBe(
        MARKETPLACE_4_CONFIG,
      );
      expect(result.current.allStakingProgramsMeta[BETA_5_ID]).toBeUndefined();
    });
  });

  describe('defaultStakingProgramMeta', () => {
    it('returns the program config when defaultStakingProgramId is set', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper({
          defaultStakingProgramId: MARKETPLACE_3_ID,
        }),
      });
      expect(result.current.defaultStakingProgramId).toBe(MARKETPLACE_3_ID);
      expect(result.current.defaultStakingProgramMeta).toBe(
        MARKETPLACE_3_CONFIG,
      );
    });

    it('returns null when defaultStakingProgramId is undefined', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper({
          defaultStakingProgramId: undefined,
        }),
      });
      expect(result.current.defaultStakingProgramMeta).toBeNull();
    });
  });

  describe('selectedStakingProgramMeta', () => {
    it('returns the program config when selectedStakingProgramId is set', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper({
          selectedStakingProgramId: MARKETPLACE_4_ID,
        }),
      });
      expect(result.current.selectedStakingProgramId).toBe(MARKETPLACE_4_ID);
      expect(result.current.selectedStakingProgramMeta).toBe(
        MARKETPLACE_4_CONFIG,
      );
    });

    it('returns null when selectedStakingProgramId is null', () => {
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper({
          selectedStakingProgramId: null,
        }),
      });
      expect(result.current.selectedStakingProgramMeta).toBeNull();
    });
  });

  describe('chain-awareness', () => {
    it('uses the evmHomeChainId from the selected agent config', () => {
      // Base chain has no programs in our mock
      setupUseServices(AgentMap.PredictTrader, EvmChainIdMap.Base);
      const { result } = renderHook(() => useStakingProgram(), {
        wrapper: createStakingProgramContextWrapper(),
      });
      expect(result.current.allStakingProgramIds).toEqual([]);
    });
  });
});
