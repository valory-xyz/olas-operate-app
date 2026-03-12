import { renderHook } from '@testing-library/react';

import { StakingProgramConfig } from '../../config/stakingPrograms';
import { AgentMap, AgentType } from '../../constants/agent';
import { EvmChainId, EvmChainIdMap } from '../../constants/chains';
import {
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '../../constants/stakingProgram';
import { useServices } from '../../hooks/useServices';
import { useStakingContracts } from '../../hooks/useStakingContracts';
import { useStakingProgram } from '../../hooks/useStakingProgram';
import { makeStakingProgramConfig } from '../helpers/factories';

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
 * - PearlBetaMechMarketplace3: active, supports PredictTrader
 * - PearlBeta5: deprecated, supports PredictTrader
 * - PearlBetaMechMarketplace4: active, supports PredictTrader
 * - ModiusAlpha: active, supports Modius only (NOT PredictTrader)
 */
const MARKETPLACE_3 = STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3;
const DEPRECATED_BETA_5 = STAKING_PROGRAM_IDS.PearlBeta5;
const MARKETPLACE_4 = STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4;
const MODIUS_ALPHA = STAKING_PROGRAM_IDS.ModiusAlpha;

const MOCK_STAKING_PROGRAMS: Record<
  EvmChainId,
  Record<string, StakingProgramConfig>
> = {
  [EvmChainIdMap.Gnosis]: {
    [MARKETPLACE_3]: makeStakingProgramConfig({
      name: 'Pearl Beta Mech Marketplace III',
      agentsSupported: [AgentMap.PredictTrader],
    }),
    [DEPRECATED_BETA_5]: makeStakingProgramConfig({
      name: 'Pearl Beta 5',
      deprecated: true,
      agentsSupported: [AgentMap.PredictTrader],
    }),
    [MARKETPLACE_4]: makeStakingProgramConfig({
      name: 'Pearl Beta Mech Marketplace IV',
      agentsSupported: [AgentMap.PredictTrader],
    }),
    [MODIUS_ALPHA]: makeStakingProgramConfig({
      name: 'Modius Alpha',
      agentsSupported: [AgentMap.Modius],
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
  selectedStakingProgramId = MARKETPLACE_3 as StakingProgramId | null,
  evmHomeChainId = EvmChainIdMap.Gnosis as EvmChainId,
  selectedAgentType = AgentMap.PredictTrader as AgentType,
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
        selectedStakingProgramId: MARKETPLACE_3,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.currentStakingProgramId).toBe(MARKETPLACE_3);
    });

    it('returns null when isActiveStakingProgramLoaded is false', () => {
      setupMocks({
        isActiveStakingProgramLoaded: false,
        selectedStakingProgramId: MARKETPLACE_3,
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
      expect(result.current.orderedStakingProgramIds).not.toContain(
        DEPRECATED_BETA_5,
      );
    });

    it('filters out programs that do not support the selected agent type', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).not.toContain(
        MODIUS_ALPHA,
      );
    });

    it('includes non-deprecated programs that support the agent type', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).toContain(MARKETPLACE_3);
      expect(result.current.orderedStakingProgramIds).toContain(MARKETPLACE_4);
    });

    it('places the active staking program first', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: MARKETPLACE_4,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds[0]).toBe(MARKETPLACE_4);
      expect(result.current.orderedStakingProgramIds).toContain(MARKETPLACE_3);
    });

    it('does not duplicate the active program in the list', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: MARKETPLACE_3,
      });

      const { result } = renderHook(() => useStakingContracts());
      const occurrences = result.current.orderedStakingProgramIds.filter(
        (id) => id === MARKETPLACE_3,
      );
      expect(occurrences).toHaveLength(1);
    });

    it('filters out a deprecated program even if it is the active staking program', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: DEPRECATED_BETA_5,
      });

      const { result } = renderHook(() => useStakingContracts());
      // DEPRECATED_BETA_5 is deprecated — the deprecated check runs before the active check
      expect(result.current.orderedStakingProgramIds).not.toContain(
        DEPRECATED_BETA_5,
      );
      // Remaining non-deprecated, supported programs are still present
      expect(result.current.orderedStakingProgramIds).toEqual([
        MARKETPLACE_3,
        MARKETPLACE_4,
      ]);
    });

    it('returns programs in correct order: active first then remaining', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: MARKETPLACE_4,
      });

      const { result } = renderHook(() => useStakingContracts());
      // MARKETPLACE_4 is active (first), MARKETPLACE_3 is non-deprecated + supported (appended)
      // DEPRECATED_BETA_5 is deprecated (filtered), MODIUS_ALPHA is unsupported (filtered)
      expect(result.current.orderedStakingProgramIds).toEqual([
        MARKETPLACE_4,
        MARKETPLACE_3,
      ]);
    });

    it('includes active program even if it does not support the selected agent type', () => {
      // MODIUS_ALPHA does NOT support PredictTrader — but it IS the active program.
      // The implementation promotes active before the agent-support filter (line 31 vs 35),
      // so the active program bypasses the agent-support check.
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: MODIUS_ALPHA,
      });

      const { result } = renderHook(() => useStakingContracts());
      // MODIUS_ALPHA is active → promoted first despite not supporting the agent type
      expect(result.current.orderedStakingProgramIds).toContain(MODIUS_ALPHA);
      expect(result.current.orderedStakingProgramIds[0]).toBe(MODIUS_ALPHA);
      // MARKETPLACE_3 and MARKETPLACE_4 still included (non-deprecated, supported)
      expect(result.current.orderedStakingProgramIds).toEqual([
        MODIUS_ALPHA,
        MARKETPLACE_3,
        MARKETPLACE_4,
      ]);
    });

    it('returns all supported non-deprecated programs when no active program', () => {
      setupMocks({
        isActiveStakingProgramLoaded: true,
        selectedStakingProgramId: null,
      });

      const { result } = renderHook(() => useStakingContracts());
      expect(result.current.orderedStakingProgramIds).toEqual([
        MARKETPLACE_3,
        MARKETPLACE_4,
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
