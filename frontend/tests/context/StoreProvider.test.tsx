import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren, useContext } from 'react';

import { ElectronApiContext } from '../../context/ElectronApiProvider';
import { StoreContext, StoreProvider } from '../../context/StoreProvider';
import type { ElectronStore } from '../../types/ElectronApi';

describe('StoreProvider', () => {
  it('loads initial store state from store.store()', async () => {
    const mockStoreData: ElectronStore = {
      environmentName: 'test-env',
    };
    const mockStoreStore = jest.fn().mockResolvedValue(mockStoreData);
    const mockIpcRendererOn = jest.fn();

    const electronContextValue = {
      store: { store: mockStoreStore },
      ipcRenderer: { on: mockIpcRendererOn },
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        ElectronApiContext.Provider,
        { value: electronContextValue },
        createElement(StoreProvider, null, children),
      );

    const { result } = renderHook(() => useContext(StoreContext), { wrapper });

    await waitFor(() => {
      expect(result.current.storeState).toEqual(mockStoreData);
    });

    expect(mockStoreStore).toHaveBeenCalled();
    expect(mockIpcRendererOn).toHaveBeenCalledWith(
      'store-changed',
      expect.any(Function),
    );
  });

  it('updates store state when store-changed IPC event fires', async () => {
    const initialData: ElectronStore = { environmentName: 'initial' };
    const updatedData: ElectronStore = { environmentName: 'updated' };

    const mockStoreStore = jest.fn().mockResolvedValue(initialData);
    let storeChangedCallback: (
      event: unknown,
      data: unknown,
    ) => void = () => {};

    const mockIpcRendererOn = jest.fn(
      (channel: string, fn: (event: unknown, data: unknown) => void) => {
        if (channel === 'store-changed') {
          storeChangedCallback = fn;
        }
      },
    );

    const electronContextValue = {
      store: { store: mockStoreStore },
      ipcRenderer: { on: mockIpcRendererOn },
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        ElectronApiContext.Provider,
        { value: electronContextValue },
        createElement(StoreProvider, null, children),
      );

    const { result } = renderHook(() => useContext(StoreContext), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.storeState).toEqual(initialData);
    });

    // Simulate store-changed IPC event
    act(() => {
      storeChangedCallback(null, updatedData);
    });

    expect(result.current.storeState).toEqual(updatedData);
  });

  it('handles undefined store and ipcRenderer gracefully', async () => {
    const electronContextValue = {
      store: undefined,
      ipcRenderer: undefined,
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        ElectronApiContext.Provider,
        { value: electronContextValue },
        createElement(StoreProvider, null, children),
      );

    const { result } = renderHook(() => useContext(StoreContext), { wrapper });

    // Store state should remain undefined since store.store() cannot be called
    expect(result.current.storeState).toBeUndefined();
  });

  it('provides undefined storeState by default when no initial data', () => {
    const electronContextValue = {};

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        ElectronApiContext.Provider,
        { value: electronContextValue },
        createElement(StoreProvider, null, children),
      );

    const { result } = renderHook(() => useContext(StoreContext), { wrapper });

    expect(result.current.storeState).toBeUndefined();
  });

  it('catches store.store() rejection and logs to console.error', async () => {
    const storeError = new Error('store unavailable');
    const mockStoreStore = jest.fn().mockRejectedValue(storeError);
    const mockIpcRendererOn = jest.fn();

    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const electronContextValue = {
      store: { store: mockStoreStore },
      ipcRenderer: { on: mockIpcRendererOn },
    };

    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(
        ElectronApiContext.Provider,
        { value: electronContextValue },
        createElement(StoreProvider, null, children),
      );

    const { result } = renderHook(() => useContext(StoreContext), { wrapper });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(storeError);
    });

    // storeState remains undefined since store.store() rejected
    expect(result.current.storeState).toBeUndefined();
    consoleSpy.mockRestore();
  });
});
