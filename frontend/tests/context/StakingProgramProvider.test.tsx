import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren, useContext } from 'react';

import {
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '../../constants/stakingProgram';
import {
  StakingProgramContext,
  StakingProgramProvider,
} from '../../context/StakingProgramProvider';
import { AgentConfig } from '../../types/Agent';
import { Service } from '../../types/Service';
import {
  DEFAULT_STAKING_PROGRAM_ID,
  makeChainConfig,
  makeMiddlewareService,
  SECOND_STAKING_PROGRAM_ID,
} from '../helpers/factories';

// ── Module mocks ──────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({}));

// ── Hook mocks ────────────────────────────────────────────────────────

const mockUseActiveStakingProgramId = jest.fn<
  { isLoading: boolean; data: StakingProgramId | null },
  [AgentConfig]
>();

const mockUseServices = jest.fn<
  {
    selectedService?: Service;
    selectedAgentConfig: {
      defaultStakingProgramId: StakingProgramId;
    };
  },
  []
>();

jest.mock('../../hooks', () => ({
  useActiveStakingProgramId: (...args: [AgentConfig]) =>
    mockUseActiveStakingProgramId(...args),
  useServices: () => mockUseServices(),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ACTIVE_PROGRAM = STAKING_PROGRAM_IDS.PearlBetaMechMarketplace4;
const SERVICE_PROGRAM = SECOND_STAKING_PROGRAM_ID;
const DEFAULT_PROGRAM = DEFAULT_STAKING_PROGRAM_ID;
const MIGRATION_TARGET = STAKING_PROGRAM_IDS.PearlBeta5;

const makeDefaultAgentConfig = (
  defaultStakingProgramId: StakingProgramId = DEFAULT_PROGRAM,
) => ({
  defaultStakingProgramId,
});

const setupMocks = ({
  isLoading = false,
  activeStakingProgramId = null as StakingProgramId | null,
  selectedService = undefined as Service | undefined,
  defaultStakingProgramId = DEFAULT_PROGRAM,
} = {}) => {
  mockUseServices.mockReturnValue({
    selectedService,
    selectedAgentConfig: makeDefaultAgentConfig(
      defaultStakingProgramId,
    ) as AgentConfig,
  });
  mockUseActiveStakingProgramId.mockReturnValue({
    isLoading,
    data: activeStakingProgramId,
  });
};

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(StakingProgramProvider, null, children);

const renderStakingProgramContext = () =>
  renderHook(() => useContext(StakingProgramContext), { wrapper });

// ── Tests ─────────────────────────────────────────────────────────────

describe('StakingProgramProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isActiveStakingProgramLoaded', () => {
    it('returns false when loading', () => {
      setupMocks({ isLoading: true });
      const { result } = renderStakingProgramContext();
      expect(result.current.isActiveStakingProgramLoaded).toBe(false);
    });

    it('returns true when loading is complete', () => {
      setupMocks({ isLoading: false });
      const { result } = renderStakingProgramContext();
      expect(result.current.isActiveStakingProgramLoaded).toBe(true);
    });
  });

  describe('activeStakingProgramId', () => {
    it('exposes the value from useActiveStakingProgramId', () => {
      setupMocks({ activeStakingProgramId: ACTIVE_PROGRAM });
      const { result } = renderStakingProgramContext();
      expect(result.current.activeStakingProgramId).toBe(ACTIVE_PROGRAM);
    });

    it('is null when hook returns null', () => {
      setupMocks({ activeStakingProgramId: null });
      const { result } = renderStakingProgramContext();
      expect(result.current.activeStakingProgramId).toBeNull();
    });
  });

  describe('selectedStakingProgramId (fallback: active → service → default)', () => {
    it('returns null while loading', () => {
      setupMocks({ isLoading: true, activeStakingProgramId: ACTIVE_PROGRAM });
      const { result } = renderStakingProgramContext();
      expect(result.current.selectedStakingProgramId).toBeNull();
    });

    it('returns activeStakingProgramId when available (highest priority)', () => {
      const serviceWithProgram = makeMiddlewareService() as Service;
      setupMocks({
        activeStakingProgramId: ACTIVE_PROGRAM,
        selectedService: serviceWithProgram,
      });
      const { result } = renderStakingProgramContext();
      expect(result.current.selectedStakingProgramId).toBe(ACTIVE_PROGRAM);
    });

    it('falls back to service-stored staking_program_id when active is null', () => {
      const serviceWithProgram = makeMiddlewareService('gnosis', {
        chain_configs: makeChainConfig('gnosis', {
          staking_program_id: SERVICE_PROGRAM,
        }),
      }) as Service;

      setupMocks({
        activeStakingProgramId: null,
        selectedService: serviceWithProgram,
      });

      const { result } = renderStakingProgramContext();
      expect(result.current.selectedStakingProgramId).toBe(SERVICE_PROGRAM);
    });

    it('falls back to defaultStakingProgramId when both active and service are null', () => {
      setupMocks({
        activeStakingProgramId: null,
        selectedService: undefined,
        defaultStakingProgramId: DEFAULT_PROGRAM,
      });
      const { result } = renderStakingProgramContext();
      expect(result.current.selectedStakingProgramId).toBe(DEFAULT_PROGRAM);
    });
  });

  describe('defaultStakingProgramId', () => {
    it('initializes from selectedAgentConfig.defaultStakingProgramId', () => {
      setupMocks({ defaultStakingProgramId: DEFAULT_PROGRAM });
      const { result } = renderStakingProgramContext();
      expect(result.current.defaultStakingProgramId).toBe(DEFAULT_PROGRAM);
    });

    it('resets when selectedAgentConfig changes', async () => {
      const NEW_DEFAULT = STAKING_PROGRAM_IDS.PearlBeta5;

      setupMocks({ defaultStakingProgramId: DEFAULT_PROGRAM });
      const { result, rerender } = renderStakingProgramContext();
      expect(result.current.defaultStakingProgramId).toBe(DEFAULT_PROGRAM);

      // Simulate selectedAgentConfig change
      mockUseServices.mockReturnValue({
        selectedService: undefined,
        selectedAgentConfig: makeDefaultAgentConfig(NEW_DEFAULT) as AgentConfig,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.defaultStakingProgramId).toBe(NEW_DEFAULT);
      });
    });
  });

  describe('setDefaultStakingProgramId', () => {
    it('updates the defaultStakingProgramId via setter', async () => {
      const NEW_VALUE = STAKING_PROGRAM_IDS.PearlBeta4;
      setupMocks({ defaultStakingProgramId: DEFAULT_PROGRAM });
      const { result } = renderStakingProgramContext();

      expect(result.current.defaultStakingProgramId).toBe(DEFAULT_PROGRAM);

      act(() => {
        result.current.setDefaultStakingProgramId(NEW_VALUE);
      });

      await waitFor(() => {
        expect(result.current.defaultStakingProgramId).toBe(NEW_VALUE);
      });
    });
  });

  describe('stakingProgramIdToMigrateTo', () => {
    it('initializes as null', () => {
      setupMocks();
      const { result } = renderStakingProgramContext();
      expect(result.current.stakingProgramIdToMigrateTo).toBeNull();
    });

    it('updates via setStakingProgramIdToMigrateTo', async () => {
      setupMocks();
      const { result } = renderStakingProgramContext();

      act(() => {
        result.current.setStakingProgramIdToMigrateTo(MIGRATION_TARGET);
      });

      await waitFor(() => {
        expect(result.current.stakingProgramIdToMigrateTo).toBe(
          MIGRATION_TARGET,
        );
      });
    });

    it('can be reset to null', async () => {
      setupMocks();
      const { result } = renderStakingProgramContext();

      act(() => {
        result.current.setStakingProgramIdToMigrateTo(MIGRATION_TARGET);
      });

      await waitFor(() => {
        expect(result.current.stakingProgramIdToMigrateTo).toBe(
          MIGRATION_TARGET,
        );
      });

      act(() => {
        result.current.setStakingProgramIdToMigrateTo(null);
      });

      await waitFor(() => {
        expect(result.current.stakingProgramIdToMigrateTo).toBeNull();
      });
    });
  });

  describe('context default values', () => {
    it('provides defaults when used outside provider', () => {
      const { result } = renderHook(() => useContext(StakingProgramContext));

      expect(result.current.isActiveStakingProgramLoaded).toBe(false);
      expect(result.current.selectedStakingProgramId).toBeNull();
      expect(result.current.stakingProgramIdToMigrateTo).toBeNull();
      // default setters are no-ops
      expect(() =>
        result.current.setDefaultStakingProgramId(DEFAULT_PROGRAM),
      ).not.toThrow();
      expect(() =>
        result.current.setStakingProgramIdToMigrateTo(MIGRATION_TARGET),
      ).not.toThrow();
    });
  });
});
