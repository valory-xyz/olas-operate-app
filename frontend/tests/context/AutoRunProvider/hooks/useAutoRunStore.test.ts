import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useAutoRunStore } from '../../../../context/AutoRunProvider/hooks/useAutoRunStore';
import { useElectronApi, useStore } from '../../../../hooks';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../../helpers/factories';

jest.mock('../../../../hooks', () => ({
  useElectronApi: jest.fn(),
  useStore: jest.fn(),
  useServices: jest.fn().mockReturnValue({
    services: [],
    getInstancesOfAgentType: jest.fn().mockReturnValue([]),
  }),
}));

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

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
    });
  });
});
