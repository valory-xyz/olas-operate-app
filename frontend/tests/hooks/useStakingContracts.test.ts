import { renderHook } from '@testing-library/react';

import { StakingProgramConfig } from '../../config/stakingPrograms';
import { AgentType } from '../../constants/agent';
import { EvmChainId, EvmChainIdMap } from '../../constants/chains';
import { StakingProgramId } from '../../constants/stakingProgram';
import { useServices } from '../../hooks/useServices';
import { useStakingContracts } from '../../hooks/useStakingContracts';
import { useStakingProgram } from '../../hooks/useStakingProgram';

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

jest.mock('../../hooks/useStakingProgram', () => ({
  useStakingProgram: jest.fn(),
}));

/**
 * Mock STAKING_PROGRAMS with four programs to test all filtering branches:
 * - program_a: active, supports selected agent type
 * - program_b: deprecated, supports selected agent type
 * - program_c: not deprecated, supports selected agent type
 * - program_d: not deprecated, does NOT support selected agent type
 */
const MOCK_AGENT_TYPE = 'trader' as AgentType;
const OTHER_AGENT_TYPE = 'modius' as AgentType;
const MOCK_CHAIN_ID = EvmChainIdMap.Gnosis;

const PROGRAM_A = 'program_a' as StakingProgramId;
const PROGRAM_B = 'program_b' as StakingProgramId;
const PROGRAM_C = 'program_c' as StakingProgramId;
const PROGRAM_D = 'program_d' as StakingProgramId;

const makeStubConfig = (
  overrides: Partial<StakingProgramConfig> = {},
): StakingProgramConfig =>
  ({
    chainId: MOCK_CHAIN_ID,
    deprecated: false,
    name: 'Stub',
    agentsSupported: [MOCK_AGENT_TYPE],
    ...overrides,
  }) as StakingProgramConfig;

const MOCK_STAKING_PROGRAMS: Record<
  EvmChainId,
  Record<string, StakingProgramConfig>
> = {
  [EvmChainIdMap.Gnosis]: {
    [PROGRAM_A]: makeStubConfig({ name: 'Program A' }),
    [PROGRAM_B]: makeStubConfig({ name: 'Program B', deprecated: true }),
    [PROGRAM_C]: makeStubConfig({ name: 'Program C' }),
    [PROGRAM_D]: makeStubConfig({
      name: 'Program D',
      agentsSupported: [OTHER_AGENT_TYPE],
    }),
  },
  [EvmChainIdMap.Base]: {},
  [EvmChainIdMap.Mode]: {},
  [EvmChainIdMap.Optimism]: {},
  [EvmChainIdMap.Polygon]: {},
};

jest.mock('../../config/stakingPrograms', () => ({
  get STAKING_PROGRAMS() {
    return MOCK_STAKING_PROGRAMS;
  },
}));

const mockUseServices = useServices as jest.Mock;
const mockUseStakingProgram = useStakingProgram as jest.Mock;

const setupMocks = ({
  isActiveStakingProgramLoaded = true,
  selectedStakingProgramId = PROGRAM_A as StakingProgramId | null,
  evmHomeChainId = MOCK_CHAIN_ID as EvmChainId,
  selectedAgentType = MOCK_AGENT_TYPE as AgentType,
}: {
  isActiveStakingProgramLoaded?: boolean;
  selectedStakingProgramId?: StakingProgramId | null;
  evmHomeChainId?: EvmChainId;
  selectedAgentType?: AgentType;
} = {}) => {
  mockUseServices.mockReturnValue({
    selectedAgentConfig: { evmHomeChainId },
    selectedAgentType,
  });
  mockUseStakingProgram.mockReturnValue({
    isActiveStakingProgramLoaded,
    selectedStakingProgramId,
  });
};

describe('useStakingContracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('currentStakingProgramId', () => {
    it('returns selectedStakingProgramId when isActiveStakingProgramLoaded is true', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: PROGRAM_A,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.currentStakingProgramId).toBe(PROGRAM_A);
    });

    it('returns null when isActiveStakingProgramLoaded is false', () => {
      setupMocks({
        isActiveStakingProgramLoaded: false,
        selectedStakingProgramId: PROGRAM_A,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.currentStakingProgramId).toBeNull();
    });

    it('returns null when selectedStakingProgramId is null and loaded', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.currentStakingProgramId).toBeNull();
    });
  });

  describe('orderedStakingProgramIds', () => {
    it('returns empty array when isActiveStakingProgramLoaded is false', () => {
      setupMocks({ isActiveStakingProgramLoaded: false });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).toEqual([]);
    });

    it('filters out deprecated programs', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).not.toContain(PROGRAM_B);
    });

    it('filters out programs that do not support the selected agent type', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).not.toContain(PROGRAM_D);
    });

    it('includes non-deprecated programs that support the agent type', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).toContain(PROGRAM_A);
      expect(result.current.orderedStakingProgramIds).toContain(PROGRAM_C);
    });

    it('places the active staking program first', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: PROGRAM_C,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds[0]).toBe(PROGRAM_C);
      expect(result.current.orderedStakingProgramIds).toContain(PROGRAM_A);
    });

    it('does not duplicate the active program in the list', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: PROGRAM_A,
      });

      const { result } = renderHook(() => useStakingContracts());
      const occurrences = result.current.orderedStakingProgramIds.filter(
        (id) => id === PROGRAM_A,
      );
      expect(occurrences).toHaveLength(1);
    });

    it('filters out a deprecated program even if it is the active staking program', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: PROGRAM_B,
      });

      const { result } = renderHook(() => useStakingContracts());
      // PROGRAM_B is deprecated — the deprecated check runs before the active check
      expect(result.current.orderedStakingProgramIds).not.toContain(PROGRAM_B);
      // Remaining non-deprecated, supported programs are still present
      expect(result.current.orderedStakingProgramIds).toEqual([
        PROGRAM_A,
        PROGRAM_C,
      ]);
    });

    it('returns programs in correct order: active first then remaining', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: PROGRAM_C,
      });

      const { result } = renderHook(() => useStakingContracts());
      // PROGRAM_C is active (first), PROGRAM_A is non-deprecated + supported (appended)
      // PROGRAM_B is deprecated (filtered), PROGRAM_D is unsupported (filtered)
      expect(result.current.orderedStakingProgramIds).toEqual([
        PROGRAM_C,
        PROGRAM_A,
      ]);
    });

    it('includes active program even if it does not support the selected agent type', () => {
      // PROGRAM_D does NOT support MOCK_AGENT_TYPE — but it IS the active program.
      // The implementation promotes active before the agent-support filter (line 31 vs 35),
      // so the active program bypasses the agent-support check.
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: PROGRAM_D,
      });

      const { result } = renderHook(() => useStakingContracts());
      // PROGRAM_D is active → promoted first despite not supporting the agent type
      expect(result.current.orderedStakingProgramIds).toContain(PROGRAM_D);
      expect(result.current.orderedStakingProgramIds[0]).toBe(PROGRAM_D);
      // PROGRAM_A and PROGRAM_C still included (non-deprecated, supported)
      expect(result.current.orderedStakingProgramIds).toEqual([
        PROGRAM_D,
        PROGRAM_A,
        PROGRAM_C,
      ]);
    });

    it('returns all supported non-deprecated programs when no active program', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).toEqual([
        PROGRAM_A,
        PROGRAM_C,
      ]);
    });

    it('returns empty when chain has no programs', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
        evmHomeChainId: EvmChainIdMap.Base,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).toEqual([]);
    });
  });
});
