import { act, renderHook } from '@testing-library/react';

import { useSidebarArchive } from '../../../../components/MainPage/hooks/useSidebarArchive';
import { AgentMap, PAGES, SETUP_SCREEN } from '../../../../constants';
import {
  useArchivedAgents,
  usePageState,
  useServices,
  useSetup,
} from '../../../../hooks';

jest.mock('../../../../constants/providers', () => ({}));

// ---------------------------------------------------------------------------
// Config mocks
// ---------------------------------------------------------------------------

// Three entries: two standard agents + one without evmHomeChainId to cover
// the defensive guard branch in useSidebarArchive.
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
  useArchivedAgents: jest.fn(),
}));

const mockUseSetup = useSetup as jest.MockedFunction<typeof useSetup>;
const mockUsePageState = usePageState as jest.MockedFunction<
  typeof usePageState
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseArchivedAgents = useArchivedAgents as jest.MockedFunction<
  typeof useArchivedAgents
>;

const mockGotoSetup = jest.fn();
const mockGotoPage = jest.fn();
const mockUpdateAgentType = jest.fn();
const mockArchiveAgent = jest.fn();

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
  mockUseArchivedAgents.mockReturnValue({
    archivedAgents,
    archiveAgent: mockArchiveAgent,
    isArchived: (t: string) => archivedAgents.includes(t),
    unarchiveAgent: jest.fn(),
  } as unknown as ReturnType<typeof useArchivedAgents>);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSidebarArchive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultSetup();
  });

  describe('myAgents', () => {
    it('returns both agents when none are archived', () => {
      const { result } = renderHook(() => useSidebarArchive());
      expect(result.current.myAgents).toHaveLength(2);
      expect(result.current.myAgents.map((a) => a.agentType)).toEqual([
        AgentMap.AgentsFun,
        AgentMap.PredictTrader,
      ]);
    });

    it('excludes archived agents from myAgents', () => {
      defaultSetup({ archivedAgents: [AgentMap.AgentsFun] });
      const { result } = renderHook(() => useSidebarArchive());
      expect(result.current.myAgents).toHaveLength(1);
      expect(result.current.myAgents[0].agentType).toBe(AgentMap.PredictTrader);
    });

    it('returns empty array when services is null', () => {
      defaultSetup({ services: null });
      const { result } = renderHook(() => useSidebarArchive());
      expect(result.current.myAgents).toEqual([]);
    });

    it('populates chainName and name from config', () => {
      const { result } = renderHook(() => useSidebarArchive());
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
      const { result } = renderHook(() => useSidebarArchive());
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
      const { result } = renderHook(() => useSidebarArchive());
      expect(result.current.myAgents).toEqual([]);
    });
  });

  describe('pendingArchiveAgent / setPendingArchiveAgent', () => {
    it('starts as undefined', () => {
      const { result } = renderHook(() => useSidebarArchive());
      expect(result.current.pendingArchiveAgent).toBeUndefined();
    });

    it('can be set via setPendingArchiveAgent', () => {
      const { result } = renderHook(() => useSidebarArchive());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      expect(result.current.pendingArchiveAgent).toBe(AgentMap.AgentsFun);
    });
  });

  describe('pendingArchiveAgentName', () => {
    it('returns empty string when no pending agent', () => {
      const { result } = renderHook(() => useSidebarArchive());
      expect(result.current.pendingArchiveAgentName).toBe('');
    });

    it('returns the display name of the pending agent', () => {
      const { result } = renderHook(() => useSidebarArchive());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      expect(result.current.pendingArchiveAgentName).toBe('Agents.fun');
    });

    it('returns empty string when pending agent is not in myAgents', () => {
      // AgentMap.Modius is not in twoServices so it never appears in myAgents
      const { result } = renderHook(() => useSidebarArchive());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.Modius);
      });
      expect(result.current.pendingArchiveAgentName).toBe('');
    });
  });

  describe('handleArchiveConfirm', () => {
    it('does nothing when pendingArchiveAgent is undefined', () => {
      const { result } = renderHook(() => useSidebarArchive());
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockArchiveAgent).not.toHaveBeenCalled();
    });

    it('calls archiveAgent with the pending agent type', () => {
      const { result } = renderHook(() => useSidebarArchive());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockArchiveAgent).toHaveBeenCalledWith(AgentMap.AgentsFun);
    });

    it('clears pendingArchiveAgent after confirm', () => {
      const { result } = renderHook(() => useSidebarArchive());
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
      const { result } = renderHook(() => useSidebarArchive());
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
      const { result } = renderHook(() => useSidebarArchive());
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
      const { result } = renderHook(() => useSidebarArchive());
      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockUpdateAgentType).not.toHaveBeenCalled();
      expect(mockGotoPage).not.toHaveBeenCalled();
    });
  });

  describe('optimistic exclusion', () => {
    it('hides agent immediately on archive confirm before store updates', () => {
      defaultSetup({ selectedAgentType: AgentMap.PredictTrader });
      const { result } = renderHook(() => useSidebarArchive());

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

    it('clears optimistic entry once archivedAgents from store catches up', () => {
      defaultSetup({ selectedAgentType: AgentMap.PredictTrader });
      const { result, rerender } = renderHook(() => useSidebarArchive());

      act(() => {
        result.current.setPendingArchiveAgent(AgentMap.AgentsFun);
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });

      // Simulate store catching up
      mockUseArchivedAgents.mockReturnValue({
        archivedAgents: [AgentMap.AgentsFun],
        archiveAgent: mockArchiveAgent,
        isArchived: (t: string) => t === AgentMap.AgentsFun,
        unarchiveAgent: jest.fn(),
      } as unknown as ReturnType<typeof useArchivedAgents>);
      rerender();

      // Agent still absent (now via archivedAgents, not optimistic state)
      expect(
        result.current.myAgents.find((a) => a.agentType === AgentMap.AgentsFun),
      ).toBeUndefined();
    });
  });
});
