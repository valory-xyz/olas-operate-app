import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { StoreService } from '@/service/StoreService';
import type { PearlStore } from '@/types/ElectronApi';

import { ElectronApiContext } from './ElectronApiProvider';
import {
  registerPearlStoreDeleteHandler,
  registerPearlStoreSetHandler,
} from './pearlStoreEventBus';

export const StoreContext = createContext<{ storeState?: PearlStore }>({
  storeState: undefined,
});

// Backend-bound keys that must be migrated from Electron store to pearl_store.json.
const BACKEND_BOUND_KEYS: string[] = [
  'trader',
  'memeooorr',
  'modius',
  'optimus',
  'pett_ai',
  'polymarket_trader',
  'firstStakingRewardAchieved',
  'lastSelectedServiceConfigId',
  'lastSelectedAgentType',
  'archivedAgents',
  'archivedInstances',
  'lastProvidedBackupWallet',
  'autoRun',
  'recoveryPhraseBackedUp',
];

/** Apply a dot-notation key write to a store object, returning a new object. */
const applyNestedSet = (store: PearlStore, key: string, value: unknown): PearlStore => {
  const parts = key.split('.');
  if (parts.length === 1) {
    return { ...store, [key]: value };
  }
  const [head, ...rest] = parts;
  const existing = (store as Record<string, unknown>)[head];
  return {
    ...store,
    [head]: applyNestedSet(
      (typeof existing === 'object' && existing !== null
        ? existing
        : {}) as PearlStore,
      rest.join('.'),
      value,
    ),
  };
};

/** Apply a dot-notation key delete to a store object, returning a new object. */
const applyNestedDelete = (store: PearlStore, key: string): PearlStore => {
  const parts = key.split('.');
  if (parts.length === 1) {
    const next = { ...store };
    delete (next as Record<string, unknown>)[key];
    return next;
  }
  const [head, ...rest] = parts;
  const existing = (store as Record<string, unknown>)[head];
  if (typeof existing !== 'object' || existing === null) return store;
  return {
    ...store,
    [head]: applyNestedDelete(existing as PearlStore, rest.join('.')),
  };
};

export const StoreProvider = ({ children }: PropsWithChildren) => {
  const { store } = useContext(ElectronApiContext);
  const [storeState, setStoreState] = useState<PearlStore>();

  // Register event bus handlers so ElectronApiProvider can push writes here.
  useEffect(() => {
    registerPearlStoreSetHandler((key, value) => {
      setStoreState((prev) =>
        prev === undefined ? prev : applyNestedSet(prev, key, value),
      );
    });
    registerPearlStoreDeleteHandler((key) => {
      setStoreState((prev) =>
        prev === undefined ? prev : applyNestedDelete(prev, key),
      );
    });
  }, []);

  // Load initial store state from the backend HTTP API (on mount only).
  // No polling — all writes originate in the frontend so state stays in sync.
  useEffect(() => {
    if (storeState) return;

    StoreService.getStore()
      .then((data) =>
        setStoreState((prev) => (prev === undefined ? data : prev)),
      )
      .catch(console.error);
  }, [storeState]);

  // One-time migration: copy backend-bound keys from Electron store to pearl_store.json.
  // Gated by `hasMigratedToBackendStore` flag so it only runs once per installation.
  useEffect(() => {
    if (!store?.get || !store?.set) return;

    store.get('hasMigratedToBackendStore').then((alreadyMigrated) => {
      if (alreadyMigrated) return;

      Promise.all(
        BACKEND_BOUND_KEYS.map((key) =>
          store.get!(key).then((value) =>
            value !== undefined && value !== null
              ? StoreService.setStoreKey(key, value)
              : Promise.resolve(),
          ),
        ),
      )
        .then(() => store.set!('hasMigratedToBackendStore', true))
        .catch(console.error);
    });
  }, [store]);

  return (
    <StoreContext.Provider value={{ storeState }}>
      {children}
    </StoreContext.Provider>
  );
};
