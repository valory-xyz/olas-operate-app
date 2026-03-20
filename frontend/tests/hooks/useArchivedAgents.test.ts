import { act, renderHook } from '@testing-library/react';

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
const mockUseServices = jest.fn();

jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => mockElectronApi(),
}));
jest.mock('../../hooks/useStore', () => ({
  useStore: () => mockUseStore(),
}));
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

describe('useArchivedAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronApi.mockReturnValue({
      store: { set: mockSetStore },
    });
    mockUseStore.mockReturnValue({ storeState: {} });
    mockUseServices.mockReturnValue({ services: [] });
  });

  it('returns empty archivedInstances when storeState has no archivedInstances', () => {
    mockUseStore.mockReturnValue({ storeState: {} });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.archivedInstances).toEqual([]);
  });

  it('returns empty archivedInstances when storeState is undefined', () => {
    mockUseStore.mockReturnValue({ storeState: undefined });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.archivedInstances).toEqual([]);
  });

  it('returns archivedInstances from storeState', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedInstances: ['sc-1', 'sc-2'] },
    });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.archivedInstances).toEqual(['sc-1', 'sc-2']);
  });

  it('isArchived returns true for an archived instance', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedInstances: ['sc-1'] },
    });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.isArchived('sc-1')).toBe(true);
  });

  it('isArchived returns false for a non-archived instance', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedInstances: ['sc-1'] },
    });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.isArchived('sc-2')).toBe(false);
  });

  it('isArchived returns false when no instances are archived', () => {
    mockUseStore.mockReturnValue({ storeState: {} });
    const { result } = renderHook(() => useArchivedAgents());
    expect(result.current.isArchived('sc-1')).toBe(false);
  });

  it('archiveInstance calls store.set with the instance added to archivedInstances', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedInstances: [] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.archiveInstance('sc-1');
    });

    expect(mockSetStore).toHaveBeenCalledWith('archivedInstances', ['sc-1']);
  });

  it('archiveInstance appends to existing archived instances', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedInstances: ['sc-1'] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.archiveInstance('sc-2');
    });

    expect(mockSetStore).toHaveBeenCalledWith('archivedInstances', [
      'sc-1',
      'sc-2',
    ]);
  });

  it('archiveInstance is idempotent — does not add duplicates', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedInstances: ['sc-1'] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.archiveInstance('sc-1');
    });

    expect(mockSetStore).not.toHaveBeenCalled();
  });

  it('unarchiveInstance calls store.set with the instance removed from archivedInstances', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedInstances: ['sc-1', 'sc-2'] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.unarchiveInstance('sc-1');
    });

    expect(mockSetStore).toHaveBeenCalledWith('archivedInstances', ['sc-2']);
  });

  it('unarchiveInstance is a no-op if instance was not archived', () => {
    mockUseStore.mockReturnValue({
      storeState: { archivedInstances: ['sc-1'] },
    });
    const { result } = renderHook(() => useArchivedAgents());

    act(() => {
      result.current.unarchiveInstance('sc-2');
    });

    // store.set is still called, but with unchanged list
    expect(mockSetStore).toHaveBeenCalledWith('archivedInstances', ['sc-1']);
  });

  it('does not throw when store.set is undefined', () => {
    mockElectronApi.mockReturnValue({ store: {} });
    mockUseStore.mockReturnValue({ storeState: {} });
    const { result } = renderHook(() => useArchivedAgents());

    expect(() => {
      act(() => {
        result.current.archiveInstance('sc-1');
      });
    }).not.toThrow();
  });

  it('does not throw when store is undefined', () => {
    mockElectronApi.mockReturnValue({});
    mockUseStore.mockReturnValue({ storeState: {} });
    const { result } = renderHook(() => useArchivedAgents());

    expect(() => {
      act(() => {
        result.current.unarchiveInstance('sc-1');
      });
    }).not.toThrow();
  });
});
