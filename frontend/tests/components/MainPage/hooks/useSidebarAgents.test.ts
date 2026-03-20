import { act, renderHook } from '@testing-library/react';

import { useSidebarAgents } from '../../../../components/MainPage/hooks/useSidebarAgents';
import { PAGES, SETUP_SCREEN } from '../../../../constants';
import {
  useArchivedAgents,
  useElectronApi,
  usePageState,
  useServices,
  useSetup,
  useStore,
} from '../../../../hooks';

jest.mock('../../../../constants/providers', () => ({}));

jest.mock('../../../../utils', () => ({
  getServiceInstanceName: (_service: unknown, displayName: string) =>
    `My ${displayName}`,
  isServiceOfAgent: (
    service: { service_public_id: string; home_chain: number },
    config: { servicePublicId: string; middlewareHomeChainId: number },
  ) =>
    service.service_public_id === config.servicePublicId &&
    service.home_chain === config.middlewareHomeChainId,
}));

// ---------------------------------------------------------------------------
// Config mocks
// ---------------------------------------------------------------------------

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
  useArchivedAgents: jest.fn(),
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
const mockUseArchivedAgents = useArchivedAgents as jest.MockedFunction<
  typeof useArchivedAgents
>;

const mockGotoSetup = jest.fn();
const mockGotoPage = jest.fn();
const mockUpdateSelectedServiceConfigId = jest.fn();
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
    archivedInstances?: string[];
    selectedServiceConfigId?: string;
  } = {},
) => {
  const {
    services = twoServices,
    archivedInstances = [],
    selectedServiceConfigId = 'sc-1',
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
    selectedServiceConfigId,
    updateSelectedServiceConfigId: mockUpdateSelectedServiceConfigId,
  } as unknown as ReturnType<typeof useServices>);
  mockUseElectronApi.mockReturnValue({
    store: { set: mockStoreSet },
  } as unknown as ReturnType<typeof useElectronApi>);
  mockUseStore.mockReturnValue({
    storeState: { archivedInstances },
  } as unknown as ReturnType<typeof useStore>);
  mockUseArchivedAgents.mockReturnValue({
    archivedInstances,
    isArchived: (id: string) => archivedInstances.includes(id),
    archiveInstance: jest.fn(),
    unarchiveInstance: jest.fn(),
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSidebarAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultSetup();
  });

  describe('activeServiceConfigIds', () => {
    it('returns all service config ids when none are archived', () => {
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.activeServiceConfigIds).toEqual(['sc-1', 'sc-2']);
    });

    it('excludes archived instances', () => {
      defaultSetup({ archivedInstances: ['sc-1'] });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.activeServiceConfigIds).toEqual(['sc-2']);
    });

    it('returns empty array when services is null', () => {
      defaultSetup({ services: null });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.activeServiceConfigIds).toEqual([]);
    });
  });

  describe('pendingArchiveInstanceId / setPendingArchiveInstanceId', () => {
    it('starts as undefined', () => {
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.pendingArchiveInstanceId).toBeUndefined();
    });

    it('can be set via setPendingArchiveInstanceId', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-1');
      });
      expect(result.current.pendingArchiveInstanceId).toBe('sc-1');
    });
  });

  describe('pendingArchiveInstanceName', () => {
    it('returns empty string when no pending instance', () => {
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.pendingArchiveInstanceName).toBe('');
    });

    it('returns formatted name when pending instance exists', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-1');
      });
      expect(result.current.pendingArchiveInstanceName).toBe(
        'My Agents.fun (Agents.fun)',
      );
    });

    it('returns empty string when pending instance is not in services', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-unknown');
      });
      expect(result.current.pendingArchiveInstanceName).toBe('');
    });
  });

  describe('handleArchiveConfirm', () => {
    it('does nothing when pendingArchiveInstanceId is undefined', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockStoreSet).not.toHaveBeenCalled();
    });

    it('calls archiveInstance with the pending id', () => {
      const mockArchive = jest.fn();
      mockUseArchivedAgents.mockReturnValue({
        archivedInstances: [],
        isArchived: () => false,
        archiveInstance: mockArchive,
        unarchiveInstance: jest.fn(),
      });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-1');
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockArchive).toHaveBeenCalledWith('sc-1');
    });

    it('clears pendingArchiveInstanceId after confirm', () => {
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-1');
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(result.current.pendingArchiveInstanceId).toBeUndefined();
    });

    it('selects next instance and navigates to Main when archived instance was selected', () => {
      defaultSetup({ selectedServiceConfigId: 'sc-1' });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-1');
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockUpdateSelectedServiceConfigId).toHaveBeenCalledWith('sc-2');
      expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Main);
    });

    it('navigates to AgentOnboarding when no next instance exists', () => {
      defaultSetup({
        services: [
          {
            service_public_id: 'valory/memeooorr_pearl:0.1.0',
            home_chain: 8453,
            service_config_id: 'sc-1',
          },
        ],
        selectedServiceConfigId: 'sc-1',
      });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-1');
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockGotoPage).toHaveBeenCalledWith(PAGES.Setup);
      expect(mockGotoSetup).toHaveBeenCalledWith(SETUP_SCREEN.AgentOnboarding);
    });

    it('does not navigate when a different instance was selected', () => {
      defaultSetup({ selectedServiceConfigId: 'sc-2' });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-1');
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockUpdateSelectedServiceConfigId).not.toHaveBeenCalled();
      expect(mockGotoPage).not.toHaveBeenCalled();
    });

    it('does not archive the same instance twice', () => {
      defaultSetup({ archivedInstances: ['sc-1'] });
      const { result } = renderHook(() => useSidebarAgents());
      act(() => {
        result.current.setPendingArchiveInstanceId('sc-1');
      });
      act(() => {
        result.current.handleArchiveConfirm();
      });
      expect(mockStoreSet).not.toHaveBeenCalled();
    });
  });

  describe('immediate hide on archive', () => {
    it('filters out archived instances from active list', () => {
      defaultSetup({ archivedInstances: ['sc-1'] });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.activeServiceConfigIds).not.toContain('sc-1');
      expect(result.current.activeServiceConfigIds).toEqual(['sc-2']);
    });

    it('reflects changes when useArchivedAgents updates', () => {
      defaultSetup();
      const { result, rerender } = renderHook(() => useSidebarAgents());
      expect(result.current.activeServiceConfigIds).toHaveLength(2);

      mockUseArchivedAgents.mockReturnValue({
        archivedInstances: ['sc-1'],
        isArchived: (id: string) => id === 'sc-1',
        archiveInstance: jest.fn(),
        unarchiveInstance: jest.fn(),
      });
      rerender();

      expect(result.current.activeServiceConfigIds).not.toContain('sc-1');
    });

    it('reflects restore when archived list empties', () => {
      defaultSetup({ archivedInstances: ['sc-1'] });
      const { result, rerender } = renderHook(() => useSidebarAgents());
      expect(result.current.activeServiceConfigIds).toHaveLength(1);

      mockUseArchivedAgents.mockReturnValue({
        archivedInstances: [],
        isArchived: () => false,
        archiveInstance: jest.fn(),
        unarchiveInstance: jest.fn(),
      });
      rerender();

      expect(result.current.activeServiceConfigIds).toHaveLength(2);
    });
  });

  describe('canAddNewAgents', () => {
    it('returns true when there are archived instances regardless of available slots', () => {
      defaultSetup({ archivedInstances: ['sc-1'] });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.canAddNewAgents).toBe(true);
    });

    it('returns true when not all available agent slots are deployed', () => {
      defaultSetup({
        services: [
          {
            service_public_id: 'valory/memeooorr_pearl:0.1.0',
            home_chain: 8453,
            service_config_id: 'sc-1',
          },
        ],
        archivedInstances: [],
      });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.canAddNewAgents).toBe(true);
    });

    it('returns false when all available slots are deployed and no archived instances', () => {
      defaultSetup({ archivedInstances: [] });
      const { result } = renderHook(() => useSidebarAgents());
      expect(result.current.canAddNewAgents).toBe(false);
    });
  });
});
