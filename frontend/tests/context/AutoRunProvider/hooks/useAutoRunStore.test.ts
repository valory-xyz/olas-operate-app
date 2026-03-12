import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { AgentMap } from '../../../../constants/agent';
import { useAutoRunStore } from '../../../../context/AutoRunProvider/hooks/useAutoRunStore';
import { useElectronApi, useStore } from '../../../../hooks';

jest.mock('../../../../hooks', () => ({
  useElectronApi: jest.fn(),
  useStore: jest.fn(),
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
    expect(result.current.includedAgents).toEqual([]);
    expect(result.current.userExcludedAgents).toEqual([]);
  });

  it('reads enabled and includedAgents from storeState', () => {
    const storedIncluded = [{ agentType: AgentMap.PredictTrader, order: 0 }];
    mockUseStore.mockReturnValue({
      storeState: {
        autoRun: {
          enabled: true,
          isInitialized: true,
          includedAgents: storedIncluded,
          userExcludedAgents: [AgentMap.Modius],
        },
      },
    } as unknown as ReturnType<typeof useStore>);

    const { result } = renderHook(() => useAutoRunStore());
    expect(result.current.enabled).toBe(true);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.includedAgents).toEqual(storedIncluded);
    expect(result.current.userExcludedAgents).toEqual([AgentMap.Modius]);
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
    expect(result.current.includedAgents).toEqual([]);
    expect(result.current.userExcludedAgents).toEqual([]);
  });

  it('updateAutoRun merges partial with existing state', () => {
    const storedIncluded = [{ agentType: AgentMap.PredictTrader, order: 0 }];
    mockUseStore.mockReturnValue({
      storeState: {
        autoRun: {
          enabled: true,
          isInitialized: true,
          includedAgents: storedIncluded,
          userExcludedAgents: [],
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
      includedAgents: storedIncluded,
      userExcludedAgents: [],
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

  it('updateAutoRun uses defaults when ref has no prior values', () => {
    const { result } = renderHook(() => useAutoRunStore());
    act(() => {
      result.current.updateAutoRun({
        includedAgents: [{ agentType: AgentMap.Optimus, order: 0 }],
      });
    });

    expect(mockStoreSet).toHaveBeenCalledWith('autoRun', {
      enabled: false,
      isInitialized: false,
      includedAgents: [{ agentType: AgentMap.Optimus, order: 0 }],
      userExcludedAgents: [],
    });
  });
});
