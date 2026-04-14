import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { StoreService } from '@/service/StoreService';
import type { PearlStore } from '@/types/ElectronApi';

import { ElectronApiContext } from './ElectronApiProvider';
import {
  registerPearlStoreDeleteHandler,
  registerPearlStoreSetHandler,
} from './pearlStoreEventBus';
import { BACKEND_BOUND_KEYS } from './pearlStoreKeys';

export const StoreContext = createContext<{ storeState?: PearlStore }>({
  storeState: undefined,
});

/** Apply a dot-notation key write to a store object, returning a new object. */
const applyNestedSet = (
  store: PearlStore,
  key: string,
  value: unknown,
): PearlStore => {
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

type PendingOp =
  | { type: 'set'; key: string; value: unknown }
  | { type: 'delete'; key: string };

const HYDRATION_RETRY_DELAY_MS = 3000;
const HYDRATION_MAX_RETRIES = 3;

export const StoreProvider = ({ children }: PropsWithChildren) => {
  const { store } = useContext(ElectronApiContext);
  const [storeState, setStoreState] = useState<PearlStore>();
  const hydrationAttempted = useRef(false);

  // Queue for writes that arrive before hydration completes.
  // Once storeState is set, the queue is drained and all pending ops are applied.
  const pendingOpsRef = useRef<PendingOp[]>([]);
  const isHydratedRef = useRef(false);

  // Apply a store operation or queue it if hydration hasn't completed yet.
  const applyOrQueue = useRef({
    set: (key: string, value: unknown) => {
      if (isHydratedRef.current) {
        setStoreState((prev) =>
          prev === undefined ? prev : applyNestedSet(prev, key, value),
        );
      } else {
        pendingOpsRef.current.push({ type: 'set', key, value });
      }
    },
    delete: (key: string) => {
      if (isHydratedRef.current) {
        setStoreState((prev) =>
          prev === undefined ? prev : applyNestedDelete(prev, key),
        );
      } else {
        pendingOpsRef.current.push({ type: 'delete', key });
      }
    },
  }).current;

  // Drain pending operations after hydration, applying them on top of the
  // freshly loaded store state so no writes are lost.
  const drainPendingOps = (baseState: PearlStore): PearlStore => {
    let state = baseState;
    for (const op of pendingOpsRef.current) {
      if (op.type === 'set') {
        state = applyNestedSet(state, op.key, op.value);
      } else {
        state = applyNestedDelete(state, op.key);
      }
    }
    pendingOpsRef.current = [];
    return state;
  };

  // Register event bus handlers so ElectronApiProvider can push writes here.
  useEffect(() => {
    registerPearlStoreSetHandler(applyOrQueue.set);
    registerPearlStoreDeleteHandler(applyOrQueue.delete);
  }, [applyOrQueue]);

  // Load initial store state from the backend HTTP API (on mount only).
  // No polling — all writes originate in the frontend so state stays in sync.
  // Retries up to HYDRATION_MAX_RETRIES times on failure to avoid permanently
  // stuck state when the backend is briefly unavailable.
  useEffect(() => {
    if (hydrationAttempted.current) return;
    hydrationAttempted.current = true;

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const attemptHydration = (retriesLeft: number) => {
      StoreService.getStore()
        .then((data) => {
          if (cancelled) return;
          // Drain any writes that arrived before hydration completed.
          const finalState = drainPendingOps(data);
          isHydratedRef.current = true;
          setStoreState(finalState);
        })
        .catch((error) => {
          console.error('Failed to hydrate pearl store:', error);
          if (!cancelled && retriesLeft > 0) {
            retryTimeout = setTimeout(
              () => attemptHydration(retriesLeft - 1),
              HYDRATION_RETRY_DELAY_MS,
            );
          }
        });
    };

    attemptHydration(HYDRATION_MAX_RETRIES);

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
    };
  }, []);

  // One-time migration: copy backend-bound keys from Electron store to pearl_store.json.
  // Gated by `hasMigratedToBackendStore` flag so it only runs once per installation.
  useEffect(() => {
    const storeGet = store?.get;
    const storeSet = store?.set;
    if (!storeGet || !storeSet) return;

    storeGet('hasMigratedToBackendStore').then((alreadyMigrated) => {
      if (alreadyMigrated) return;

      Promise.all(
        BACKEND_BOUND_KEYS.map((key) =>
          storeGet(key).then((value) =>
            value !== undefined && value !== null
              ? StoreService.setStoreKey(key, value)
              : Promise.resolve(),
          ),
        ),
      )
        .then(() => storeSet('hasMigratedToBackendStore', true))
        .then(() =>
          // Refresh storeState from the now-populated pearl_store.json.
          StoreService.getStore().then((data) => {
            const finalState = drainPendingOps(data);
            isHydratedRef.current = true;
            setStoreState(finalState);
          }),
        )
        .catch(console.error);
    });
  }, [store]);

  return (
    <StoreContext.Provider value={{ storeState }}>
      {children}
    </StoreContext.Provider>
  );
};
