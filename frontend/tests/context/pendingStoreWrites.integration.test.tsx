import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, PropsWithChildren, useContext } from 'react';

import {
  ElectronApiContext,
  ElectronApiProvider,
} from '../../context/ElectronApiProvider';
import { resetPendingStoreWrites } from '../../context/pendingStoreWrites';
import { StoreContext, StoreProvider } from '../../context/StoreProvider';
import { StoreService } from '../../service/StoreService';
import { makeElectronApiMock } from '../helpers/factories';

// Only the HTTP layer is faked. The event bus, both providers, and the write
// queue are the real thing — the bug lives in the seam between them.
jest.mock('../../service/StoreService', () => ({
  StoreService: {
    getStore: jest.fn(),
    setStoreKey: jest.fn(),
    deleteStoreKey: jest.fn(),
  },
}));

const mockGetStore = StoreService.getStore as jest.Mock;
const mockSetStoreKey = StoreService.setStoreKey as jest.Mock;
const mockDeleteStoreKey = StoreService.deleteStoreKey as jest.Mock;

/** Stands in for the Python backend's pearl_store.json. */
const backend = {
  reachable: true,
  data: {} as Record<string, unknown>,
};

/** Stands in for electron-store — survives "restarts", unlike the renderer. */
let electronStore: Record<string, unknown> = {};

const failedToFetch = () =>
  Promise.reject(new TypeError('Failed to fetch')) as Promise<never>;

/**
 * Mount the provider tree the way _app.tsx does. Each call is a fresh renderer
 * process reading the same electron-store.
 */
const startSession = () => {
  const api = makeElectronApiMock();
  api.store.get.mockImplementation((key: string) =>
    Promise.resolve(electronStore[key]),
  );
  api.store.set.mockImplementation((key: string, value: unknown) => {
    electronStore[key] = value;
    return Promise.resolve();
  });
  api.store.clear.mockImplementation(() => {
    electronStore = {};
    return Promise.resolve();
  });
  (window as unknown as Record<string, unknown>).electronAPI = api;

  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      ElectronApiProvider,
      null,
      createElement(StoreProvider, null, children),
    );

  return renderHook(
    () => ({
      electron: useContext(ElectronApiContext),
      store: useContext(StoreContext),
    }),
    { wrapper },
  );
};

/** Quit Pearl: the renderer dies, so the in-memory queue is gone. */
const quit = (session: ReturnType<typeof startSession>) => {
  session.unmount();
  resetPendingStoreWrites();
};

describe('pending store writes (ElectronApiProvider + StoreProvider)', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    resetPendingStoreWrites();

    backend.reachable = true;
    backend.data = {};
    electronStore = {
      // Migration is a no-op in these tests — it has its own suite.
      pearlStoreMigrationComplete: true,
      pearlStoreAutoRunRepaired: true,
    };

    mockGetStore.mockImplementation(() =>
      backend.reachable
        ? Promise.resolve({ ...backend.data })
        : failedToFetch(),
    );
    mockSetStoreKey.mockImplementation((key: string, value: unknown) => {
      if (!backend.reachable) return failedToFetch();
      backend.data[key] = value;
      return Promise.resolve(undefined);
    });
    mockDeleteStoreKey.mockImplementation((key: string) => {
      if (!backend.reachable) return failedToFetch();
      delete backend.data[key];
      return Promise.resolve(undefined);
    });

    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    delete (window as unknown as Record<string, unknown>).electronAPI;
  });

  /** Toggle a setting the way a hook such as useAutoRunStore would. */
  const setKey = async (
    session: ReturnType<typeof startSession>,
    key: string,
    value: unknown,
  ) => {
    await act(async () => {
      await session.result.current.electron.store?.set?.(key, value);
    });
  };

  it('keeps Auto-Run off when the backend dies before the write lands', async () => {
    backend.data = { autoRun: { enabled: true } };

    const session1 = startSession();
    await waitFor(() => {
      expect(session1.result.current.store.storeState).toEqual({
        autoRun: { enabled: true },
      });
    });

    // Backend exits during shutdown, then the user disables Auto-Run.
    backend.reachable = false;
    await setKey(session1, 'autoRun', { enabled: false });

    expect(electronStore.pendingStoreWrites).toEqual([
      { key: 'autoRun', op: 'set', value: { enabled: false } },
    ]);
    expect(backend.data.autoRun).toEqual({ enabled: true }); // write never landed
    quit(session1);

    // Next launch, backend healthy.
    backend.reachable = true;
    const session2 = startSession();
    await waitFor(() => {
      expect(session2.result.current.store.storeState).toEqual({
        autoRun: { enabled: false },
      });
    });

    expect(backend.data.autoRun).toEqual({ enabled: false });
    expect(electronStore.pendingStoreWrites).toEqual([]);
    quit(session2);
  });

  it('does not let a queued write undo a later successful one', async () => {
    backend.data = { autoRun: { enabled: true } };

    const session1 = startSession();
    await waitFor(() => {
      expect(session1.result.current.store.storeState).toBeDefined();
    });

    // Backend blips: the "off" write is lost and queued.
    backend.reachable = false;
    await setKey(session1, 'autoRun', { enabled: false });

    // Backend recovers and the user turns Auto-Run back on — this one lands.
    backend.reachable = true;
    await setKey(session1, 'autoRun', { enabled: true });
    expect(backend.data.autoRun).toEqual({ enabled: true });
    quit(session1);

    const session2 = startSession();
    await waitFor(() => {
      expect(session2.result.current.store.storeState).toEqual({
        autoRun: { enabled: true },
      });
    });

    quit(session2);
  });

  it('carries the queue across a launch where the backend is still down', async () => {
    const session1 = startSession();
    await waitFor(() => {
      expect(session1.result.current.store.storeState).toBeDefined();
    });

    backend.reachable = false;
    await setKey(session1, 'autoRun', { enabled: false });
    quit(session1);

    // Second launch, backend still unreachable: the flush fails and the user
    // changes another setting, which must not displace the queued Auto-Run write.
    const session2 = startSession();
    await waitFor(() => {
      expect(mockSetStoreKey).toHaveBeenCalledWith('autoRun', {
        enabled: false,
      });
    });
    await setKey(session2, 'lastSelectedServiceConfigId', 'svc-2');

    expect(electronStore.pendingStoreWrites).toEqual([
      { key: 'autoRun', op: 'set', value: { enabled: false } },
      { key: 'lastSelectedServiceConfigId', op: 'set', value: 'svc-2' },
    ]);
    quit(session2);

    // Third launch, backend healthy: both settings are restored.
    backend.reachable = true;
    const session3 = startSession();
    await waitFor(() => {
      expect(session3.result.current.store.storeState).toEqual({
        autoRun: { enabled: false },
        lastSelectedServiceConfigId: 'svc-2',
      });
    });

    expect(electronStore.pendingStoreWrites).toEqual([]);
    quit(session3);
  });

  it('writes nothing to the queue while the backend is healthy', async () => {
    const session = startSession();
    await waitFor(() => {
      expect(session.result.current.store.storeState).toBeDefined();
    });

    await setKey(session, 'autoRun', { enabled: false });
    await setKey(session, 'lastSelectedServiceConfigId', 'svc-1');

    expect(electronStore.pendingStoreWrites).toBeUndefined();
    expect(backend.data).toEqual({
      autoRun: { enabled: false },
      lastSelectedServiceConfigId: 'svc-1',
    });
    quit(session);
  });

  it('completes a migration delete that failed at shutdown', async () => {
    // The lastSelectedAgentType migration: write the new key, drop the legacy
    // one. The delete is the half that used to be lost.
    backend.data = { lastSelectedAgentType: 'trader' };

    const session1 = startSession();
    await waitFor(() => {
      expect(session1.result.current.store.storeState).toBeDefined();
    });

    backend.reachable = false;
    await act(async () => {
      await session1.result.current.electron.store?.delete?.(
        'lastSelectedAgentType',
      );
    });

    expect(electronStore.pendingStoreWrites).toEqual([
      { key: 'lastSelectedAgentType', op: 'delete' },
    ]);
    expect(backend.data.lastSelectedAgentType).toBe('trader'); // still there
    quit(session1);

    // Next launch: the delete completes before hydration reads the store, so
    // the migration does not see the legacy key again.
    backend.reachable = true;
    const session2 = startSession();
    await waitFor(() => {
      expect(session2.result.current.store.storeState).toEqual({});
    });

    expect(backend.data.lastSelectedAgentType).toBeUndefined();
    expect(electronStore.pendingStoreWrites).toEqual([]);
    quit(session2);
  });

  it('does not replay queued writes over a reset that lands mid-flush', async () => {
    // Two writes are queued from the previous session.
    electronStore.pendingStoreWrites = [
      { key: 'autoRun', op: 'set', value: { enabled: true } },
      { key: 'lastSelectedServiceConfigId', op: 'set', value: 'svc-1' },
    ];
    backend.data = {};

    // Hold the first replayed write open so the reset interleaves with it.
    let releaseFirstWrite!: () => void;
    let signalFirstWriteStarted!: () => void;
    const firstWriteStarted = new Promise<void>((resolve) => {
      signalFirstWriteStarted = resolve;
    });

    let isFirstWrite = true;
    mockSetStoreKey.mockImplementation((key: string, value: unknown) => {
      if (!backend.reachable) return failedToFetch();
      if (isFirstWrite) {
        isFirstWrite = false;
        return new Promise<void>((resolveWrite) => {
          releaseFirstWrite = () => {
            backend.data[key] = value;
            resolveWrite();
          };
          signalFirstWriteStarted();
        });
      }
      backend.data[key] = value;
      return Promise.resolve(undefined);
    });

    const session = startSession();
    await firstWriteStarted;

    // The user resets their account while the replay is still in flight.
    // clear() must wait for that write rather than racing its deletes.
    let clearDone = false;
    const clearing = act(async () => {
      await session.result.current.electron.store?.clear?.();
      clearDone = true;
    });

    await Promise.resolve();
    expect(clearDone).toBe(false); // still waiting on the in-flight write

    releaseFirstWrite();
    await clearing;

    // The delete wins: the replayed value does not survive the reset...
    expect(backend.data.autoRun).toBeUndefined();
    // ...and the second queued entry never replays at all.
    expect(backend.data.lastSelectedServiceConfigId).toBeUndefined();
    expect(mockSetStoreKey).toHaveBeenCalledTimes(1);

    // The aborted flush must not write the queue back over the cleared slot.
    expect(electronStore.pendingStoreWrites).toBeUndefined();
    quit(session);
  });
});
