import { get } from 'lodash';

import { StoreService } from '@/service/StoreService';

/**
 * Durable queue of backend-bound store writes that failed.
 *
 * When a write to pearl_store.json fails — typically because the Python backend
 * is unreachable during shutdown — the value is queued here and persisted to
 * electron-store, which survives the restart. StoreProvider replays the queue on
 * the next launch before hydrating, so the user's last intent wins over the
 * stale backend snapshot.
 *
 * The state is process-wide rather than React state, so it lives outside both
 * providers — same pattern as pearlStoreEventBus.
 */

export type PendingStoreWrite = { key: string; value: unknown };

/** electron-store key holding the queue across restarts. */
export const PENDING_STORE_WRITES_KEY = 'pendingStoreWrites';

type RawStoreSet = (key: string, value: unknown) => Promise<void>;

/** Resolve a function off window.electronAPI, or undefined if unavailable. */
const getWindowFn = <T>(path: string): T | undefined => {
  if (typeof window === 'undefined') return undefined;
  const fn = get(window, `electronAPI.${path}`);
  return typeof fn === 'function' ? (fn as T) : undefined;
};

/** Append to the Pearl log (electron.log) for support diagnostics. */
export const logStoreEvent = (msg: string) => {
  getWindowFn<(m: string) => void>('logEvent')?.(`pearl_store: ${msg}`);
};

let queue: PendingStoreWrite[] = [];

// Sequence of the latest mutation issued for each key this session. Writes have
// no timeout, so a wedged socket can reject minutes later — long after the user
// has replaced that value. A rejection may only enqueue while it is still the
// latest mutation for its key.
let writeSeq = 0;
const latestSeqByKey = new Map<string, number>();

let flushAborted = false;
let flushInFlight: Promise<void> | null = null;

/**
 * Write the live queue to electron-store via raw IPC.
 *
 * Always snapshots current state rather than a caller's local copy, so
 * concurrent callers converge instead of racing a stale array onto disk.
 * Returns the write so callers can await durability — undefined when the IPC
 * bridge is unavailable, which callers report as memory-only queueing.
 */
const persist = (): Promise<void> | undefined => {
  const rawStoreSet = getWindowFn<RawStoreSet>('store.set');
  if (!rawStoreSet) return undefined;

  return rawStoreSet(PENDING_STORE_WRITES_KEY, [...queue]).catch((error) => {
    logStoreEvent(
      `Failed to persist write queue (${queue.length} entries lost on restart): ${error}`,
    );
    console.error('Failed to persist pending write queue:', error);
  });
};

/**
 * Record a mutation about to be issued for `key` and return its sequence.
 * Pass the sequence to `enqueueFailedWrite` so a rejection arriving after a
 * newer mutation is discarded rather than queued. Deletes call this too, so a
 * late set failure cannot resurrect a key the user has since removed.
 */
export const beginWrite = (key: string) => {
  writeSeq += 1;
  latestSeqByKey.set(key, writeSeq);
  return writeSeq;
};

/**
 * Queue a failed write for replay on the next launch, unless a newer mutation
 * for the same key has since been issued.
 *
 * Keeps only the latest value per key: replaying a stale earlier value would
 * clobber whatever the user set afterwards. The fresh entry is appended, so the
 * last write of any key is always last in the queue and the relative order of
 * other keys is preserved.
 */
export const enqueueFailedWrite = (
  key: string,
  value: unknown,
  seq: number,
): Promise<void> | undefined => {
  if (latestSeqByKey.get(key) !== seq) {
    logStoreEvent(
      `Discarded late failure for '${key}' — superseded by a newer write`,
    );
    return undefined;
  }

  queue = [...queue.filter((entry) => entry.key !== key), { key, value }];
  const persisted = persist();

  logStoreEvent(
    persisted
      ? `Enqueued failed write for '${key}' (${queue.length} pending)`
      : `Queued failed write for '${key}' in memory only — store.set IPC unavailable, it will not survive a restart`,
  );
  return persisted;
};

/**
 * Drop any queued write for a key that has just been persisted (or deleted)
 * successfully — replaying it on the next launch would undo the newer value.
 */
export const dropQueuedWritesFor = (key: string): Promise<void> | undefined => {
  if (!queue.some((entry) => entry.key === key)) return undefined;

  queue = queue.filter((entry) => entry.key !== key);
  const persisted = persist();

  logStoreEvent(
    persisted
      ? `Dropped superseded queued write for '${key}'`
      : `Dropped superseded queued write for '${key}' in memory only — store.set IPC unavailable, the stale entry remains on disk`,
  );
  return persisted;
};

/**
 * Drop the queue and stop any in-flight startup flush. Used by `store.clear`:
 * the reset deletes backend keys, so neither the queued writes nor the replay
 * still in progress may reach the backend afterwards.
 */
export const abortPendingWriteFlush = () => {
  queue = [];
  flushAborted = true;
};

/** Register (or clear) the startup flush, so `store.clear` can wait for it. */
export const setPendingWriteFlush = (flush: Promise<void> | null) => {
  flushInFlight = flush;
};

/** Resolves once any in-flight startup flush has settled. Never rejects. */
export const awaitPendingWriteFlush = () =>
  flushInFlight ? flushInFlight.catch(() => {}) : Promise.resolve();

/**
 * Narrow whatever electron-store handed back to well-formed entries.
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

type FlushDeps = {
  /** Reads the persisted queue from electron-store. */
  storeGet: (key: string) => Promise<unknown>;
  /** Writes the queue back to electron-store. */
  storeSet: (key: string, value: unknown) => Promise<void>;
  /** Appends to the Pearl log. */
  log: (msg: string) => void;
  /** True once the owning provider has unmounted. */
  isCancelled: () => boolean;
};

/**
 * Replay writes queued by a previous session, before hydration reads the
 * backend. Failure is non-fatal — anything still failing stays queued for the
 * next launch.
 */
export const flushPendingWrites = async ({
  storeGet,
  storeSet,
  log,
  isCancelled,
}: FlushDeps) => {
  const persisted = await storeGet(PENDING_STORE_WRITES_KEY);
  const parsed = toPendingStoreWrites(persisted);
  const discarded =
    (Array.isArray(persisted) ? persisted.length : 0) - parsed.length;

  if (discarded > 0) {
    log(`Discarded ${discarded} malformed pending write(s)`);
    console.error(
      `[StoreProvider] Discarded ${discarded} malformed pending write(s)`,
    );
  }

  // A key already mutated this session has a newer value than anything the
  // previous session left on disk — whether that mutation succeeded or failed
  // and re-queued itself. Replaying the disk entry would revert it.
  const replayable = parsed.filter((entry) => !latestSeqByKey.has(entry.key));
  const superseded = parsed.length - replayable.length;
  if (superseded > 0) {
    log(`Skipped ${superseded} pending write(s) superseded this session`);
  }

  // Adopt the previous session's queue before replaying it, so a write that
  // fails later in this session merges with these entries rather than
  // overwriting them on disk.
  queue = [...replayable];

  if (replayable.length === 0) {
    // Don't re-read discarded or superseded entries on every launch.
    if (discarded > 0 || superseded > 0) {
      await storeSet(PENDING_STORE_WRITES_KEY, []);
    }
    return;
  }

  log(`Flushing ${replayable.length} pending write(s) to backend`);

  // Replay sequentially, not concurrently — concurrent writes to the same key
  // would land in a non-deterministic order.
  const succeeded: PendingStoreWrite[] = [];
  const failedKeys: string[] = [];
  let aborted = false;

  for (const entry of replayable) {
    // Re-checked every iteration, not just before the loop: `store.clear` can
    // land mid-replay, and a write sent after its delete would put the key
    // back in pearl_store.json.
    if (isCancelled() || flushAborted) {
      aborted = true;
      break;
    }
    // A successful in-session write already superseded this entry — replaying
    // it would revert the newer value. Identity works because the loop and the
    // queue share the same objects.
    if (!queue.includes(entry)) continue;

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
    // The queue belongs to whoever aborted us — don't write it back.
    log(
      `Flush aborted after ${succeeded.length} write(s) — store cleared or provider unmounted`,
    );
    return;
  }

  // Drop what landed, keeping anything queued since the flush began. Identity
  // comparison so a fresh failure for the same key is never dropped.
  const flushed = new Set(succeeded);
  queue = queue.filter((entry) => !flushed.has(entry));
  await storeSet(PENDING_STORE_WRITES_KEY, [...queue]);

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

/** Read the in-memory queue. Used by tests only. */
export const getPendingWriteQueue = () => [...queue];

/** Reset all queue state. Used by tests only. */
export const resetPendingStoreWrites = () => {
  queue = [];
  writeSeq = 0;
  latestSeqByKey.clear();
  flushAborted = false;
  flushInFlight = null;
};
