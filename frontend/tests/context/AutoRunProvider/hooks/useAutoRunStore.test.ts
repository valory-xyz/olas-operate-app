import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap } from '../../../../constants/agent';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { useAutoRunStore } from '../../../../context/AutoRunProvider/hooks/useAutoRunStore';
import { useElectronApi, useServices, useStore } from '../../../../hooks';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeConnectService,
  makeMiddlewareService,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
} from '../../../helpers/factories';

jest.mock('../../../../hooks', () => ({
  useElectronApi: jest.fn(),
  useStore: jest.fn(),
  useServices: jest.fn(),
}));

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;
const mockUseServices = useServices as jest.Mock;

describe('useAutoRunStore', () => {
  const mockStoreSet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseElectronApi.mockReturnValue({
      store: { set: mockStoreSet },
    } as unknown as ReturnType<typeof useElectronApi>);
    mockUseStore.mockReturnValue({
      storeState: null,
    } as unknown as ReturnType<typeof useStore>);
    mockUseServices.mockReturnValue({
      services: [],
      getInstancesOfAgentType: jest.fn().mockReturnValue([]),
    });
  });

  it('returns defaults when storeState is null', () => {
    const { result } = renderHook(() => useAutoRunStore());
    expect(result.current.enabled).toBe(false);
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.includedInstances).toEqual([]);
    expect(result.current.userExcludedInstances).toEqual([]);
  });

  it('reads enabled and includedInstances from storeState', () => {
    const storedIncluded = [
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
    ];
    mockUseStore.mockReturnValue({
      storeState: {
        autoRun: {
          enabled: true,
          isInitialized: true,
          includedAgentInstances: storedIncluded,
          userExcludedAgentInstances: [MOCK_SERVICE_CONFIG_ID_2],
        },
      },
    } as unknown as ReturnType<typeof useStore>);

    const { result } = renderHook(() => useAutoRunStore());
    expect(result.current.enabled).toBe(true);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.includedInstances).toEqual(storedIncluded);
    expect(result.current.userExcludedInstances).toEqual([
      MOCK_SERVICE_CONFIG_ID_2,
    ]);
  });

  it('defaults missing fields from storeState.autoRun', () => {
    mockUseStore.mockReturnValue({
      storeState: {
        autoRun: { enabled: true },
      },
    } as unknown as ReturnType<typeof useStore>);

    const { result } = renderHook(() => useAutoRunStore());
    expect(result.current.enabled).toBe(true);
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.includedInstances).toEqual([]);
    expect(result.current.userExcludedInstances).toEqual([]);
  });

  it('updateAutoRun merges partial with existing state', () => {
    const storedIncluded = [
      { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
    ];
    mockUseStore.mockReturnValue({
      storeState: {
        autoRun: {
          enabled: true,
          isInitialized: true,
          includedAgentInstances: storedIncluded,
          userExcludedAgentInstances: [],
        },
      },
    } as unknown as ReturnType<typeof useStore>);

    const { result } = renderHook(() => useAutoRunStore());
    act(() => {
      result.current.updateAutoRun({ enabled: false });
    });

    expect(mockStoreSet).toHaveBeenCalledWith('autoRun', {
      enabled: false,
      isInitialized: true,
      includedAgentInstances: storedIncluded,
      userExcludedAgentInstances: [],
      // Set by the one-time Connect migration, which ran on mount.
      connectAutoRunMigrated: true,
    });
  });

  it('updateAutoRun does not call store.set when store is undefined', () => {
    mockUseElectronApi.mockReturnValue({
      store: undefined,
    } as unknown as ReturnType<typeof useElectronApi>);

    const { result } = renderHook(() => useAutoRunStore());
    act(() => {
      result.current.updateAutoRun({ enabled: true });
    });

    expect(mockStoreSet).not.toHaveBeenCalled();
  });

  it('updateAutoRun falls back to defaults when ref fields are undefined', () => {
    mockUseStore.mockReturnValue({
      storeState: {
        autoRun: {
          enabled: undefined,
          isInitialized: undefined,
          includedAgentInstances: undefined,
          userExcludedAgentInstances: undefined,
        },
      },
    } as unknown as ReturnType<typeof useStore>);
    const { result } = renderHook(() => useAutoRunStore());
    act(() => {
      result.current.updateAutoRun({ enabled: true });
    });
    expect(mockStoreSet).toHaveBeenCalledWith('autoRun', {
      enabled: true,
      isInitialized: false,
      includedAgentInstances: [],
      userExcludedAgentInstances: [],
      connectAutoRunMigrated: true,
    });
  });

  it('updateAutoRun uses defaults when ref has no prior values', () => {
    const { result } = renderHook(() => useAutoRunStore());
    act(() => {
      result.current.updateAutoRun({
        includedInstances: [
          { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 0 },
        ],
      });
    });

    expect(mockStoreSet).toHaveBeenCalledWith('autoRun', {
      enabled: false,
      isInitialized: false,
      includedAgentInstances: [
        { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 0 },
      ],
      userExcludedAgentInstances: [],
      connectAutoRunMigrated: true,
    });
  });
  describe('one-time Connect migration', () => {
    const connectA = makeConnectService(MiddlewareChainMap.POLYGON, {
      service_config_id: MOCK_SERVICE_CONFIG_ID_2,
    });
    const connectB = makeConnectService(MiddlewareChainMap.GNOSIS, {
      service_config_id: MOCK_SERVICE_CONFIG_ID_3,
    });
    const trader = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
    });

    const withServices = (
      services: ReturnType<typeof makeMiddlewareService>[] | undefined,
    ) => {
      const getInstancesOfAgentType = jest.fn((agentType: string) =>
        agentType === AgentMap.Connect
          ? (services ?? []).filter((service) =>
              [connectA, connectB].includes(service),
            )
          : [],
      );
      mockUseServices.mockReturnValue({ services, getInstancesOfAgentType });
      return getInstancesOfAgentType;
    };

    const withAutoRun = (autoRun: Record<string, unknown> | undefined) =>
      mockUseStore.mockReturnValue({
        storeState: autoRun ? { autoRun } : {},
      } as unknown as ReturnType<typeof useStore>);

    it('excludes existing Connect instances once and sets the flag', () => {
      withServices([trader, connectA, connectB]);
      withAutoRun({
        enabled: true,
        isInitialized: true,
        includedAgentInstances: [
          { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
        ],
        userExcludedAgentInstances: [MOCK_SERVICE_CONFIG_ID_2],
      });

      const { result, rerender } = renderHook(() => useAutoRunStore());

      expect(result.current.userExcludedInstances).toEqual([
        MOCK_SERVICE_CONFIG_ID_2,
        MOCK_SERVICE_CONFIG_ID_3,
      ]);
      rerender();
      expect(mockStoreSet).toHaveBeenCalledTimes(1);
      expect(mockStoreSet).toHaveBeenCalledWith('autoRun', {
        enabled: true,
        isInitialized: true,
        includedAgentInstances: [
          { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
        ],
        // Already-excluded Connect is not duplicated; other agents untouched.
        userExcludedAgentInstances: [
          MOCK_SERVICE_CONFIG_ID_2,
          MOCK_SERVICE_CONFIG_ID_3,
        ],
        connectAutoRunMigrated: true,
      });
    });

    it('does nothing once the flag is set', () => {
      withServices([trader, connectA]);
      withAutoRun({
        enabled: true,
        isInitialized: true,
        includedAgentInstances: [],
        userExcludedAgentInstances: [],
        connectAutoRunMigrated: true,
      });

      const { result } = renderHook(() => useAutoRunStore());

      expect(mockStoreSet).not.toHaveBeenCalled();
      expect(result.current.userExcludedInstances).toEqual([]);
    });

    it('keeps the flag on later writes so the migration never re-runs', () => {
      withServices([trader, connectA]);
      withAutoRun({ enabled: false, connectAutoRunMigrated: true });

      const { result } = renderHook(() => useAutoRunStore());
      act(() => {
        result.current.updateAutoRun({ enabled: true });
      });

      expect(mockStoreSet).toHaveBeenCalledWith(
        'autoRun',
        expect.objectContaining({ connectAutoRunMigrated: true }),
      );
    });

    it('also runs when Auto-run was never initialised', () => {
      withServices([trader, connectA]);
      withAutoRun(undefined);

      const { result } = renderHook(() => useAutoRunStore());

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.userExcludedInstances).toEqual([
        MOCK_SERVICE_CONFIG_ID_2,
      ]);
      expect(mockStoreSet).toHaveBeenCalledWith(
        'autoRun',
        expect.objectContaining({
          isInitialized: false,
          userExcludedAgentInstances: [MOCK_SERVICE_CONFIG_ID_2],
          connectAutoRunMigrated: true,
        }),
      );
    });

    it('waits for the store to hydrate', () => {
      withServices([trader, connectA]);
      mockUseStore.mockReturnValue({
        storeState: undefined,
      } as unknown as ReturnType<typeof useStore>);

      renderHook(() => useAutoRunStore());

      expect(mockStoreSet).not.toHaveBeenCalled();
    });

    it('waits for services to load', () => {
      const getInstancesOfAgentType = withServices(undefined);
      withAutoRun({ enabled: true, isInitialized: true });

      const { rerender } = renderHook(() => useAutoRunStore());
      expect(mockStoreSet).not.toHaveBeenCalled();
      expect(getInstancesOfAgentType).not.toHaveBeenCalled();

      withServices([trader, connectA]);
      rerender();
      expect(mockStoreSet).toHaveBeenCalledWith(
        'autoRun',
        expect.objectContaining({
          userExcludedAgentInstances: [MOCK_SERVICE_CONFIG_ID_2],
        }),
      );
    });
  });
});
