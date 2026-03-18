import { act, renderHook } from '@testing-library/react';

import { useSidebarAgents } from '../../../../components/MainPage/hooks/useSidebarAgents';
import { AgentMap, PAGES, SETUP_SCREEN } from '../../../../constants';
import {
  useElectronApi,
  usePageState,
  useServices,
  useSetup,
  useStore,
} from '../../../../hooks';

jest.mock('../../../../constants/providers', () => ({}));

// ---------------------------------------------------------------------------
// Config mocks
// ---------------------------------------------------------------------------

// Three entries: two standard agents + one without evmHomeChainId to cover
// the defensive guard branch in useSidebarAgents.
jest.mock('../../../../config/agents', () => ({
  ACTIVE_AGENTS: [
    [
      'memeooorr',
      {
        displayName: 'Agents.fun',
        servicePublicId: 'valory/memeooorr_pearl:0.1.0',
        middlewareHomeChainId: 8453,
        evmHomeChainId: 8453,
        isAgentEnabled: true,
      },
    ],
    [
      'trader',
      {
        displayName: 'Omenstrat',
        servicePublicId: 'valory/trader_pearl:0.1.0',
        middlewareHomeChainId: 100,
        evmHomeChainId: 100,
        isAgentEnabled: true,
      },
    ],
    [
      'modius',
      {
        displayName: 'Modius',
        servicePublicId: 'valory/modius_pearl:0.1.0',
        middlewareHomeChainId: 1,
        evmHomeChainId: undefined,
        isAgentEnabled: true,
      },
    ],
  ],
  AVAILABLE_FOR_ADDING_AGENTS: [
    ['memeooorr', {}],
    ['trader', {}],
  ],
}));

jest.mock('../../../../config/chains', () => ({
  CHAIN_CONFIG: {
    8453: { name: 'Base' },
    100: { name: 'Gnosis' },
  },
}));

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../hooks', () => ({
  useSetup: jest.fn(),
  usePageState: jest.fn(),
  useServices: jest.fn(),
  useElectronApi: jest.fn(),
  useStore: jest.fn(),
}));

const mockUseSetup = useSetup as jest.MockedFunction<typeof useSetup>;
const mockUsePageState = usePageState as jest.MockedFunction<
  typeof usePageState
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

const mockGotoSetup = jest.fn();
const mockGotoPage = jest.fn();
const mockUpdateAgentType = jest.fn();
const mockStoreSet = jest.fn();

const twoServices = [
  {
    service_public_id: 'valory/memeooorr_pearl:0.1.0',
    home_chain: 8453,
    service_config_id: 'sc-1',
  },
  {
    service_public_id: 'valory/trader_pearl:0.1.0',
    home_chain: 100,
    service_config_id: 'sc-2',
  },
];

const defaultSetup = (
  overrides: {
    services?: unknown[] | null;
    archivedAgents?: string[];
    selectedAgentType?: string;
  } = {},
) => {
  const {
    services = twoServices,
    archivedAgents = [],
    selectedAgentType = AgentMap.AgentsFun,
  } = overrides;

  mockUseSetup.mockReturnValue({
    goto: mockGotoSetup,
  } as unknown as ReturnType<typeof useSetup>);
  mockUsePageState.mockReturnValue({
    pageState: PAGES.Main,
    goto: mockGotoPage,
  } as unknown as ReturnType<typeof usePageState>);
  mockUseServices.mockReturnValue({
    services,
    isLoading: false,
    selectedAgentType,
    updateAgentType: mockUpdateAgentType,
  } as unknown as ReturnType<typeof useServices>);
  mockUseElectronApi.mockReturnValue({
    store: { set: mockStoreSet },
  } as unknown as ReturnType<typeof useElectronApi>);
  mockUseStore.mockReturnValue({
    storeState: { archivedAgents },
  } as unknown as ReturnType<typeof useStore>);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSidebarAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultSetup();
  });

  describe('myAgents', () => {
    it('returns both agents when none are archived', () => {
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.myAgents).toHaveLength(2);
      expect(result.current.myAgents.map((a) => a.agentType)).toEqual([
        AgentMap.AgentsFun,
        AgentMap.PredictTrader,
      ]);
    });

    it('excludes archived agents from myAgents', () => {
      defaultSetup({ archivedAgents: [AgentMap.AgentsFun] });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.myAgents).toHaveLength(1);
      expect(result.current.myAgents[0].agentType).toBe(AgentMap.PredictTrader);
    });

    it('returns empty array when services is null', () => {
      defaultSetup({ services: null });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.myAgents).toEqual([]);
    });

    it('populates chainName and name from config', () => {
      const { result } = renderHook(() => useSidebarAgents());
      const agentsFun = result.current.myAgents.find(
        (a) => a.agentType === AgentMap.AgentsFun,
      );
      expect(agentsFun?.name).toBe('Agents.fun');
      expect(agentsFun?.chainName).toBe('Base');
      expect(agentsFun?.chainId).toBe(8453);
    });

    it('skips services that have no matching agent config', () => {
      defaultSetup({
        services: [
          {
            service_public_id: 'unknown/agent:0.1.0',
            home_chain: 8453,
            service_config_id: 'sc-unknown',
          },
        ],
      });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.myAgents).toEqual([]);
    });

    it('skips agents whose config has no evmHomeChainId', () => {
      // The modius entry in ACTIVE_AGENTS mock has evmHomeChainId: undefined
      defaultSetup({
        services: [
          {
            service_public_id: 'valory/modius_pearl:0.1.0',
            home_chain: 1,
            service_config_id: 'sc-modius',
          },
        ],
      });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.myAgents).toEqual([]);
    });
  });

  describe('pendingArchiveAgent / setPendingArchiveAgent', () => {
    it('starts as undefined', () => {
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.pendingArchiveAgent).toBeUndefined();
    });

    it('can be set via setPendingArchiveAgent', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      expect(result.current.pendingArchiveAgent).toBe(AgentMap.AgentsFun);
    });
  });

  describe('pendingArchiveAgentName', () => {
    it('returns empty string when no pending agent', () => {
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.pendingArchiveAgentName).toBe('');
    });

    it('returns the display name of the pending agent', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      expect(result.current.pendingArchiveAgentName).toBe('Agents.fun');
    });

    it('returns empty string when pending agent is not in myAgents', () => {
      // AgentMap.Modius is not in twoServices so it never appears in myAgents
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.Modius);
      });
      expect(result.current.pendingArchiveAgentName).toBe('');
    });
  });

  describe('handleArchiveConfirm', () => {
    it('does nothing when pendingArchiveAgent is undefined', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockStoreSet).not.toHaveBeenCalled();
    });

    it('writes updated archivedAgents to store', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockStoreSet).toHaveBeenCalledWith('archivedAgents', [
        AgentMap.AgentsFun,
      ]);
    });

    it('clears pendingArchiveAgent after confirm', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(result.current.pendingArchiveAgent).toBeUndefined();
    });

    it('selects next agent and navigates to Main when archived agent was selected', () => {
      defaultSetup({ selectedAgentType: AgentMap.AgentsFun });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockUpdateAgentType).toHaveBeenCalledWith(AgentMap.PredictTrader);
      expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Main);
    });

    it('navigates to AgentOnboarding when no next agent exists', () => {
      defaultSetup({
        services: [
          {
            service_public_id: 'valory/memeooorr_pearl:0.1.0',
            home_chain: 8453,
            service_config_id: 'sc-1',
          },
        ],
        selectedAgentType: AgentMap.AgentsFun,
      });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Setup);
      expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding);
    });

    it('does not call updateAgentType when a different agent was selected', () => {
      defaultSetup({ selectedAgentType: AgentMap.PredictTrader });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockUpdateAgentType).not.toHaveBeenCalled();
      expect(mockGotoPage).not.toHaveBeenCalled();
    });

    it('does not archive the same agent twice', () => {
      defaultSetup({ archivedAgents: [AgentMap.AgentsFun] });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockStoreSet).not.toHaveBeenCalled();
    });
  });

  describe('immediate hide on archive', () => {
    it('hides agent immediately on archive confirm', () => {
      defaultSetup({ selectedAgentType: AgentMap.PredictTrader });
      const { result } = renderHook(() => useSidebarAgents());

      expect(result.current.myAgents).toHaveLength(2);

      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });

      expect(
        result.current.myAgents.find((a) => a.agentType === AgentMap.AgentsFun),
      ).toBeUndefined();
    });

    it('seeds archivedAgents from store when store loads after initial render', () => {
      // Simulate store not yet loaded on first render
      mockUseStore.mockReturnValue({
        storeState: { archivedAgents: undefined },
      } as unknown as ReturnType<typeof useStore>);

      const { result, rerender } = renderHook(() => useSidebarAgents());
      expect(result.current.myAgents).toHaveLength(2);

      // Store loads with an archived agent
      mockUseStore.mockReturnValue({
        storeState: { archivedAgents: [AgentMap.AgentsFun] },
      } as unknown as ReturnType<typeof useStore>);
      rerender();

      expect(
        result.current.myAgents.find((a) => a.agentType === AgentMap.AgentsFun),
      ).toBeUndefined();
    });

    it('reflects restore (unarchive) written externally to store', () => {
      // Start with AgentsFun archived
      defaultSetup({ archivedAgents: [AgentMap.AgentsFun] });
      const { result, rerender } = renderHook(() => useSidebarAgents());
      expect(result.current.myAgents).toHaveLength(1);

      // External code calls unarchiveAgent → store updates
      mockUseStore.mockReturnValue({
        storeState: { archivedAgents: [] },
      } as unknown as ReturnType<typeof useStore>);
      rerender();

      expect(result.current.myAgents).toHaveLength(2);
      expect(
        result.current.myAgents.find((a) => a.agentType === AgentMap.AgentsFun),
      ).toBeDefined();
    });
  });
});
