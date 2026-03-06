import { renderHook, waitFor } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { ElectronApiContext } from '../../context/ElectronApiProvider';
import { StoreContext, StoreProvider } from '../../context/StoreProvider';

const useStoreContext = () => React.useContext(StoreContext);

const createWrapper = (electronApi: Record<string, unknown>) => {
  return ({ children }: PropsWithChildren) =>
    React.createElement(
      ElectronApiContext.Provider,
      { value: electronApi },
      React.createElement(StoreProvider, null, children),
    );
};

describe('StoreProvider', () => {
  it('starts with undefined storeState', () => {
    const wrapper = createWrapper({ store: {}, ipcRenderer: {} });
    const { result } = renderHook(() => useStoreContext(), { wrapper });
    expect(result.current.storeState).toBeUndefined();
  });

  it('fetches and sets store on mount', async () => {
    const mockStoreData = { environmentName: 'production' };
    const mockStoreFn = jest.fn().mockResolvedValue(mockStoreData);
    const mockOn = jest.fn();

    const wrapper = createWrapper({
      store: { store: mockStoreFn },
      ipcRenderer: { on: mockOn },
    });

    const { result } = renderHook(() => useStoreContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.storeState).toEqual(mockStoreData);
    });

    expect(mockStoreFn).toHaveBeenCalledTimes(1);
  });

  it('registers store-changed IPC listener', async () => {
    const mockStoreFn = jest.fn().mockResolvedValue({ environmentName: 'dev' });
    const mockOn = jest.fn();

    const wrapper = createWrapper({
      store: { store: mockStoreFn },
      ipcRenderer: { on: mockOn },
    });

    renderHook(() => useStoreContext(), { wrapper });

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith(
        'store-changed',
        expect.any(Function),
      );
    });
  });
});
