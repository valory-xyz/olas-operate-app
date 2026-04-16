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

const LOG_PREFIX = 'pearl_store:';

export const StoreProvider = ({ children }: PropsWithChildren) => {
  const { store, logEvent } = useContext(ElectronApiContext);
  const [storeState, setStoreState] = useState<PearlStore>();
  const hydrationAttempted = useRef(false);

  // Stable ref so async callbacks can log without stale closures.
  const logRef = useRef(logEvent);
  logRef.current = logEvent;
  const log = (msg: string) => logRef.current?.(`${LOG_PREFIX} ${msg}`);

  // Queue for writes that arrive before hydration completes.
  // Once storeState is set, the queue is drained and all pending ops are applied.
  const pendingOpsRef = useRef<PendingOp[]>([]);
  const isHydratedRef = useRef(false);

  // Snapshot of backend store at hydration time — used by migration to decide
  // which keys are missing. Must NOT reflect post-hydration writes from other
  // hooks (e.g. useAutoRunStore), otherwise migration skips keys it should copy.
  const hydrationSnapshotRef = useRef<PearlStore>({});

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
  // Cleanup on unmount to prevent stale state updates.
  useEffect(() => {
    registerPearlStoreSetHandler(applyOrQueue.set);
    registerPearlStoreDeleteHandler(applyOrQueue.delete);
    return () => {
      registerPearlStoreSetHandler(() => {});
      registerPearlStoreDeleteHandler(() => {});
    };
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
      const attempt = HYDRATION_MAX_RETRIES - retriesLeft + 1;
      StoreService.getStore()
        .then((data) => {
          if (cancelled) return;
          hydrationSnapshotRef.current = data;
          const finalState = drainPendingOps(data);
          isHydratedRef.current = true;
          setStoreState(finalState);

          const keyCount = Object.keys(data).length;
          if (keyCount === 0) {
            log(`Hydrated on attempt ${attempt} (empty store)`);
          } else {
            log(`Hydrated on attempt ${attempt} (${keyCount} keys)`);
          }
        })
        .catch((error) => {
          const msg = error instanceof Error ? error.message : String(error);
          log(`Hydration attempt ${attempt} failed: ${msg}`);
          console.error(
            `[StoreProvider] Hydration attempt ${attempt} failed:`,
            error,
          );

          // Data corruption errors (500, bad JSON) won't recover on retry —
          // fall back to empty store immediately so the app is usable.
          const isCorrupt =
            msg.includes('HTTP 500') ||
            msg.includes('not valid JSON') ||
            msg.includes('not a valid object');
          if (!cancelled && isCorrupt) {
            log('Store appears corrupt, falling back to empty store');
            const finalState = drainPendingOps({});
            isHydratedRef.current = true;
            setStoreState(finalState);
            return;
          }

          if (!cancelled && retriesLeft > 0) {
            retryTimeout = setTimeout(
              () => attemptHydration(retriesLeft - 1),
              HYDRATION_RETRY_DELAY_MS,
            );
          } else if (!cancelled) {
            log(
              'Hydration failed after all retries, falling back to empty store',
            );
            console.error(
              '[StoreProvider] Hydration failed after all retries.',
            );
            const finalState = drainPendingOps({});
            isHydratedRef.current = true;
            setStoreState(finalState);
          }
        });
    };

    attemptHydration(HYDRATION_MAX_RETRIES);

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
    };
  }, []);

  // Migration: copy backend-bound keys from Electron store to pearl_store.json.
  // Runs when the Electron store has keys that the backend store is missing.
  // Handles first upgrade, .operate folder swaps, and partial migrations.
  // Compares against the hydration snapshot (not live storeState) to avoid
  // races with hooks that write defaults before migration runs.
  const migrationAttempted = useRef(false);
  useEffect(() => {
    const storeGet = store?.get;
    if (!storeGet) return;
    if (!isHydratedRef.current) return;
    if (migrationAttempted.current) return;
    migrationAttempted.current = true;

    const snapshot = hydrationSnapshotRef.current;

    // Read all backend-bound keys from Electron store, then migrate any
    // that are present in Electron but missing from the hydration snapshot.
    Promise.all(
      BACKEND_BOUND_KEYS.map((key) =>
        storeGet(key).then((value) => ({ key, value })),
      ),
    )
      .then((entries) => {
        const toMigrate = entries.filter(
          ({ key, value }) =>
            value !== undefined &&
            value !== null &&
            (snapshot as Record<string, unknown>)[key] === undefined,
        );
        if (toMigrate.length === 0) {
          log('No Electron store keys to migrate');
          return;
        }

        log(
          `Migrating ${toMigrate.length} keys: ${toMigrate.map((e) => e.key).join(', ')}`,
        );

        return Promise.all(
          toMigrate.map(({ key, value }) =>
            StoreService.setStoreKey(key, value),
          ),
        ).then(() =>
          StoreService.getStore().then((data) => {
            const finalState = drainPendingOps(data);
            isHydratedRef.current = true;
            setStoreState(finalState);
            log('Migration complete');
          }),
        );
      })
      .catch((error) => {
        log(`Migration failed: ${error}`);
        console.error('[StoreProvider] Migration failed:', error);
      });
  }, [store, storeState]);

  return (
    <StoreContext.Provider value={{ storeState }}>
      {children}
    </StoreContext.Provider>
  );
};
