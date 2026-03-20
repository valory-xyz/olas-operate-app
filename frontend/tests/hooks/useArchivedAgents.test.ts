import { act, renderHook } from '@testing-library/react';

import { AgentMap } from '../../constants/agent';
import { useArchivedAgents } from '../../hooks/useArchivedAgents';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const mockSetStore = jest.fn();
const mockElectronApi = jest.fn();
const mockUseStore = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => mockElectronApi(),
}));
jest.mock('../../hooks/useStore', () => ({
  useStore: () => mockUseStore(),
}));

describe('useArchivedAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronApi.mockReturnValue({
      store: { set: mockSetStore },
    });
    mockUseStore.mockReturnValue({ storeState: {} });
  });

  it('returns empty archivedAgents when storeState has no archivedAgents', () => {
    mockUseStore.mockReturnValue({ storeState: {} });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.archivedAgents).toEqual([]);
  });

  it('returns empty archivedAgents when storeState is undefined', () => {
    mockUseStore.mockReturnValue({ storeState: undefined });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.archivedAgents).toEqual([]);
  });

  it('returns archivedAgents from storeState', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedAgents: [AgentMap.AgentsFun, AgentMap.Modius] },
    });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.archivedAgents).toEqual([
      AgentMap.AgentsFun,
      AgentMap.Modius,
    ]);
  });

  it('isArchived returns true for an archived agent', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedAgents: [AgentMap.AgentsFun] },
    });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.isArchived(AgentMap.AgentsFun)).toBe(true);
  });

  it('isArchived returns false for a non-archived agent', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedAgents: [AgentMap.AgentsFun] },
    });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.isArchived(AgentMap.PredictTrader)).toBe(false);
  });

  it('isArchived returns false when no agents are archived', () => {
    mockUseStore.mockReturnValue({ storeState: {} });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.isArchived(AgentMap.PredictTrader)).toBe(false);
  });

  it('archiveAgent calls store.set with the agent added to archivedAgents', () => {
    mockUseStore.mockReturnValue({ storeState: { archivedAgents: [] } });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.archiveAgent(AgentMap.AgentsFun);
    });

    expect(mockSetStore).toHaveBeenCalledWith('archivedAgents', [
      AgentMap.AgentsFun,
    ]);
  });

  it('archiveAgent appends to existing archived agents', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedAgents: [AgentMap.AgentsFun] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.archiveAgent(AgentMap.Modius);
    });

    expect(mockSetStore).toHaveBeenCalledWith('archivedAgents', [
      AgentMap.AgentsFun,
      AgentMap.Modius,
    ]);
  });

  it('archiveAgent is idempotent — does not add duplicates', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedAgents: [AgentMap.AgentsFun] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.archiveAgent(AgentMap.AgentsFun);
    });

    expect(mockSetStore).not.toHaveBeenCalled();
  });

  it('unarchiveAgent calls store.set with the agent removed from archivedAgents', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedAgents: [AgentMap.AgentsFun, AgentMap.Modius] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.unarchiveAgent(AgentMap.AgentsFun);
    });

    expect(mockSetStore).toHaveBeenCalledWith('archivedAgents', [
      AgentMap.Modius,
    ]);
  });

  it('unarchiveAgent is a no-op if agent was not archived', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedAgents: [AgentMap.AgentsFun] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.unarchiveAgent(AgentMap.Modius);
    });

    // store.set is still called, but with unchanged list
    expect(mockSetStore).toHaveBeenCalledWith('archivedAgents', [
      AgentMap.AgentsFun,
    ]);
  });

  it('does not throw when store.set is undefined', () => {
    mockElectronApi.mockReturnValue({ store: {} });
    mockUseStore.mockReturnValue({ storeState: {} });
    const { result } = renderHook(() => useArchivedAgents());

    expect(() => {
      act(() => {
        result.current.archiveAgent(AgentMap.AgentsFun);
      });
    }).not.toThrow();
  });

  it('does not throw when store is undefined', () => {
    mockElectronApi.mockReturnValue({});
    mockUseStore.mockReturnValue({ storeState: {} });
    const { result } = renderHook(() => useArchivedAgents());

    expect(() => {
      act(() => {
        result.current.unarchiveAgent(AgentMap.AgentsFun);
      });
    }).not.toThrow();
  });
});
