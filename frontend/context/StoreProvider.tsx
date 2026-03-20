import { isEqual } from 'lodash';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { ElectronStore } from '@/types/ElectronApi';

import { ElectronApiContext } from './ElectronApiProvider';

export const StoreContext = createContext<{ storeState?: ElectronStore }>({
  storeState: undefined,
});

export const StoreProvider = ({ children }: PropsWithChildren) => {
  const { store, ipcRenderer } = useContext(ElectronApiContext);
  const [storeState, setStoreState] = useState<ElectronStore>();

  // Load initial store state
  useEffect(() => {
    if (storeState) return;

    store
      ?.store?.()
      .then((tempStore: ElectronStore) => setStoreState(tempStore))
      .catch(console.error);
  }, [store, storeState]);

  // Register store-changed listener separately (once)
  useEffect(() => {
    if (!ipcRenderer?.on) return;

    // NOTE: preload.js `on` wrapper already strips the IPC event,
    // so the handler receives `(data)` directly, NOT `(event, data)`.
    const handleStoreChanged = (data: unknown) => {
      setStoreState((prev) => {
        const next = data as ElectronStore;
        if (isEqual(prev, next)) return prev;
        return next;
      });
    };

    ipcRenderer.on('store-changed', handleStoreChanged);
  }, [ipcRenderer]);

  return (
    <StoreContext.Provider value={{ storeState }}>
      {children}
    </StoreContext.Provider>
  );
};
