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

import {
  ElectronApiContext,
  isPendingWriteFlushAborted,
  type PendingStoreWrite,
  removeFlushedWrites,
  seedPendingWriteQueue,
  setPendingWriteFlush,
} from './ElectronApiProvider';
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

/**
 * Narrow whatever electron-store handed back to well-formed queue entries.
 * `store.get` is typed `unknown` and the file is user-writable, so a bad entry
 * would otherwise reach StoreService.setStoreKey(undefined, undefined).
 */
const toPendingStoreWrites = (value: unknown): PendingStoreWrite[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is PendingStoreWrite =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as PendingStoreWrite).key === 'string' &&
      (entry as PendingStoreWrite).key.length > 0,
  );
};

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
  //
  // Before hydration, flushes any pending writes that failed on a previous
  // session (e.g. backend was down during shutdown). This ensures
  // pearl_store.json reflects the user's last intent before getStore() reads it.
  useEffect(() => {
    if (hydrationAttempted.current) return;
    hydrationAttempted.current = true;

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const flushPendingWrites = async () => {
      const storeGet = store?.get;
      const storeSet = store?.set;
      if (!storeGet || !storeSet) {
        // Not silent: this is the guard on the whole reason the flush exists,
        // so a missing bridge must be visible in the Pearl log.
        log('Skipped flush — Electron store bridge unavailable');
        return;
      }

      const persisted = await storeGet('pendingStoreWrites');
      const queue = toPendingStoreWrites(persisted);
      const discarded =
        (Array.isArray(persisted) ? persisted.length : 0) - queue.length;

      if (discarded > 0) {
        log(`Discarded ${discarded} malformed pending write(s)`);
        console.error(
          `[StoreProvider] Discarded ${discarded} malformed pending write(s)`,
        );
      }

      if (queue.length === 0) {
        // Don't re-read the malformed entries on every subsequent launch.
        if (discarded > 0) await storeSet('pendingStoreWrites', []);
        return;
      }

      // Adopt the previous session's queue before replaying it, so a write that
      // fails later in this session merges with these entries rather than
      // overwriting them on disk.
      seedPendingWriteQueue(queue);

      log(`Flushing ${queue.length} pending write(s) to backend`);
      console.error(
        `[StoreProvider] Flushing ${queue.length} pending write(s) from previous session`,
      );

      // Replay sequentially, not concurrently — concurrent writes to the same
      // key would land in a non-deterministic order.
      const succeeded: PendingStoreWrite[] = [];
      const failedKeys: string[] = [];
      let aborted = false;
      for (const entry of queue) {
        // Re-checked every iteration, not just before the loop: `store.clear`
        // can land mid-replay, and a write sent after its delete would put the
        // key back in pearl_store.json.
        if (cancelled || isPendingWriteFlushAborted()) {
          aborted = true;
          break;
        }
        try {
          await StoreService.setStoreKey(entry.key, entry.value);
          succeeded.push(entry);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          failedKeys.push(entry.key);
          log(`Flush failed for '${entry.key}': ${msg}`);
        }
      }

      if (aborted) {
        // The queue is owned by whoever aborted us — don't write it back.
        log(
          `Flush aborted after ${succeeded.length} write(s) — store cleared or provider unmounted`,
        );
        return;
      }

      const remaining = removeFlushedWrites(succeeded);
      await storeSet('pendingStoreWrites', remaining);

      if (failedKeys.length === 0) {
        log(`Flushed ${succeeded.length} pending write(s) successfully`);
      } else {
        log(
          `Flushed ${succeeded.length} write(s), ${failedKeys.length} still pending`,
        );
        console.error(
          `[StoreProvider] ${failedKeys.length} pending write(s) could not be flushed: ${failedKeys.join(', ')}`,
        );
      }
    };

    const attemptHydration = (retriesLeft: number) => {
      const attempt = HYDRATION_MAX_RETRIES - retriesLeft + 1;
      StoreService.getStore()
        .then((data) => {
          if (cancelled) return;
          hydrationSnapshotRef.current = data;
          const finalState = drainPendingOps(data);
          isHydratedRef.current = true;
          setStoreState(finalState);

          // Report raw backend key count (before draining pending ops).
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

    // Flush first, then hydrate — flush failure is non-fatal.
    const flush = flushPendingWrites().catch((error) => {
      const msg = error instanceof Error ? error.message : String(error);
      log(`Flush failed: ${msg}`);
      console.error('[StoreProvider] Flush pending writes failed:', error);
    });

    // Published so `store.clear` can wait for a replay in progress rather than
    // racing its deletes against it.
    setPendingWriteFlush(flush);

    flush.then(() => {
      setPendingWriteFlush(null);
      if (!cancelled) {
        attemptHydration(HYDRATION_MAX_RETRIES);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
    };
  }, []);

  // Migration: copy backend-bound keys from Electron store to pearl_store.json.
  //
  // Two phases, each gated by its own persistent flag in the Electron store:
  //
  // Phase 1 (pearlStoreMigrationComplete): Copy any Electron store key that is
  //   MISSING from the backend. Safe — never overwrites existing backend data.
  //   Handles first upgrade and partial migrations.
  //
  // Phase 2 (pearlStoreAutoRunRepaired): One-time repair for users hit by the
  //   autoRun race bug where useAutoRunStore wrote {enabled: false} before
  //   migration could copy the real value. If Electron has autoRun.enabled=true
  //   but backend has autoRun.enabled=false, overwrite backend with Electron.
  //
  // Both phases compare against hydrationSnapshotRef (not live storeState) to
  // avoid races with hooks that write during initialization.
  const migrationAttempted = useRef(false);
  useEffect(() => {
    const storeGet = store?.get;
    const storeSet = store?.set;
    if (!storeGet || !storeSet) return;
    if (!isHydratedRef.current) return;
    if (migrationAttempted.current) return;
    migrationAttempted.current = true;

    const snapshot = hydrationSnapshotRef.current;

    Promise.all([
      storeGet('pearlStoreMigrationComplete'),
      storeGet('pearlStoreAutoRunRepaired'),
    ])
      .then(async ([migrationDone, autoRunRepaired]) => {
        if (migrationDone && autoRunRepaired) {
          log('Migration already complete (flags set)');
          return;
        }

        let didWrite = false;

        // Phase 1: Copy missing keys from Electron → backend
        if (!migrationDone) {
          const entries = await Promise.all(
            BACKEND_BOUND_KEYS.map((key) =>
              storeGet(key).then((value) => ({ key, value })),
            ),
          );

          const toMigrate = entries.filter(
            ({ key, value }) =>
              value !== undefined &&
              value !== null &&
              (snapshot as Record<string, unknown>)[key] === undefined,
          );

          let allMigrationWritesSucceeded = true;

          if (toMigrate.length > 0) {
            log(
              `Migrating ${toMigrate.length} keys: ${toMigrate.map((e) => e.key).join(', ')}`,
            );

            const results = await Promise.allSettled(
              toMigrate.map(({ key, value }) =>
                StoreService.setStoreKey(key, value),
              ),
            );

            const successfulWrites = results.filter(
              (result) => result.status === 'fulfilled',
            ).length;
            const failedKeys = results
              .map((result, index) =>
                result.status === 'rejected'
                  ? toMigrate[index]?.key
                  : undefined,
              )
              .filter((key): key is keyof PearlStore => key !== undefined);

            if (successfulWrites > 0) {
              didWrite = true;
            }

            allMigrationWritesSucceeded = failedKeys.length === 0;

            if (!allMigrationWritesSucceeded) {
              log(
                `Migration partially failed for keys: ${failedKeys.join(', ')}`,
              );
            }
          } else {
            log('No Electron store keys to migrate');
          }

          // Only set the flag when all writes succeeded — partial failures
          // will re-migrate the missing keys on next launch.
          if (allMigrationWritesSucceeded) {
            await storeSet('pearlStoreMigrationComplete', true);
          }
        }

        // Phase 2: Repair autoRun if Electron had enabled=true but backend has enabled=false.
        // Tradeoff: if a user saw the race-bug disable their autoRun and intentionally
        // left it off, this one-shot repair will re-enable it. We accept this because
        // the common case is "user wants it restored" and there's no way to distinguish
        // "user accepted the bug" from "user didn't notice." Flag prevents re-run.
        if (!autoRunRepaired) {
          const electronAutoRun = (await storeGet('autoRun')) as
            | Record<string, unknown>
            | undefined;
          const backendAutoRun = snapshot.autoRun;

          if (
            electronAutoRun?.enabled === true &&
            backendAutoRun &&
            !backendAutoRun.enabled
          ) {
            log('Repairing autoRun.enabled (was lost during migration)');
            // Use dot-notation to set only the enabled flag — preserves any
            // backend-side fields (includedAgentInstances, etc.) that may
            // have been written after the race.
            await StoreService.setStoreKey('autoRun.enabled', true);
            didWrite = true;
          }

          await storeSet('pearlStoreAutoRunRepaired', true);
        }

        // Refresh storeState from backend if any writes were made
        if (didWrite) {
          const data = await StoreService.getStore();
          const finalState = drainPendingOps(data);
          setStoreState(finalState);
        }

        log('Migration complete');
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        log(`Migration failed: ${msg}`);
        console.error('[StoreProvider] Migration failed:', error);
      });
  }, [store, storeState]);

  return (
    <StoreContext.Provider value={{ storeState }}>
      {children}
    </StoreContext.Provider>
  );
};
