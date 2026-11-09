import { renderHook } from '@testing-library/react';

import { EvmChainIdMap } from '../../constants/chains';
import { SETUP_SCREEN } from '../../constants/setupScreen';
import {
  useBackupSignerGuard,
  useBackupSignerState,
} from '../../hooks/useBackupSigner';
import { useMultisigs } from '../../hooks/useMultisig';
import { useServices } from '../../hooks/useServices';
import { useSetup } from '../../hooks/useSetup';
import { useStore } from '../../hooks/useStore';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { useWeb3AuthStatus } from '../../hooks/useWeb3AuthStatus';
import {
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
  makeMasterSafe,
  makeMultisigOwners,
} from '../helpers/factories';

jest.mock('../../hooks/useSetup', () => ({ useSetup: jest.fn() }));
jest.mock('../../hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../hooks/useMultisig', () => ({ useMultisigs: jest.fn() }));
jest.mock('../../hooks/useServices', () => ({ useServices: jest.fn() }));
const mockLogEvent = jest.fn();
jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: () => ({ logEvent: mockLogEvent }),
}));
jest.mock('../../hooks/useWeb3AuthStatus', () => ({
  useWeb3AuthStatus: jest.fn(),
}));

const mockUseSetup = useSetup as jest.Mock;
const mockUseStore = useStore as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseMultisigs = useMultisigs as jest.Mock;
const mockUseServices = useServices as jest.Mock;
const mockUseWeb3AuthStatus = useWeb3AuthStatus as jest.Mock;
const mockGoto = jest.fn();

const SAFE = makeMasterSafe(EvmChainIdMap.Gnosis);
const OWNERS_ERROR = 'Failed to read Safe owners on chain 100: rpc down';
const OWNERS_FAILED = { state: 'error', reason: OWNERS_ERROR };
const WALLETS_FAILED = { state: 'error', reason: 'Failed to read the wallets' };
const web3AuthPick = { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' };
const manualPick = { address: BACKUP_SIGNER_ADDRESS, type: 'manual' };

const given = ({
  status = 'enabled',
  pick,
  storedPick,
  storeLoaded = true,
  masterSafes = [],
  walletsLoaded = true,
  walletsError = false,
  owners = [],
  ownersData,
  ownersError = false,
  homeChainId = EvmChainIdMap.Base,
}: {
  status?: 'loading' | 'enabled' | 'disabled';
  /** The pick in the setup context. */
  pick?: { address: string; type: string };
  /** The pick in the pearl store (`lastProvidedBackupWallet`). */
  storedPick?: { address: string; type: string };
  storeLoaded?: boolean;
  masterSafes?: unknown[];
  walletsLoaded?: boolean;
  walletsError?: boolean;
  owners?: string[];
  /** Owner data from the owners query; like the real query, none without a Safe. */
  ownersData?: unknown[] | null;
  ownersError?: boolean;
  /** The agent's home chain; by default not the chain `SAFE` is on, so a Safe will be created. */
  homeChainId?: number;
}) => {
  const ownerData =
    ownersData === undefined
      ? masterSafes.length
        ? [
            makeMultisigOwners(
              EvmChainIdMap.Gnosis,
              owners as Parameters<typeof makeMultisigOwners>[1],
            ),
          ]
        : undefined
      : (ownersData ?? undefined);
  mockUseWeb3AuthStatus.mockReturnValue({ status });
  mockUseServices.mockReturnValue({
    selectedAgentConfig: { evmHomeChainId: homeChainId },
  });
  mockUseSetup.mockReturnValue({ goto: mockGoto, backupSigner: pick });
  mockUseStore.mockReturnValue({
    storeState: storeLoaded
      ? { lastProvidedBackupWallet: storedPick ?? pick }
      : undefined,
  });
  mockUseMasterWalletContext.mockReturnValue({
    masterWallets: walletsLoaded ? masterSafes : undefined,
    masterSafes: walletsLoaded ? masterSafes : undefined,
    isError: walletsError,
  });
  mockUseMultisigs.mockReturnValue({
    allBackupAddresses: ownerData ? owners : [],
    masterSafesOwners: ownerData,
    masterSafesOwnersIsError: ownersError,
    masterSafesOwnersError: ownersError ? new Error(OWNERS_ERROR) : null,
  });
};

/** Routing (login) mode. */
const state = () => renderHook(() => useBackupSignerState()).result.current;
/** Safe-creation mode (the gate and the mutation). */
const stateForSafeCreation = () =>
  renderHook(() => useBackupSignerState({ forSafeCreation: true })).result
    .current;

describe('useBackupSignerState', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('with Web3Auth enabled', () => {
    it('uses the stored pick', () => {
      given({ pick: web3AuthPick, owners: [BACKUP_SIGNER_ADDRESS_2] });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS,
      });
    });

    it('falls back to the on-chain backup owner with no stored pick', () => {
      given({ masterSafes: [SAFE], owners: [BACKUP_SIGNER_ADDRESS_2] });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
      });
    });

    it('for Safe creation, waits for the Safe owners before falling back to them with no stored pick', () => {
      given({ masterSafes: [SAFE], ownersData: null });
      expect(stateForSafeCreation()).toEqual({ state: 'pending' });

      given({ masterSafes: [SAFE], ownersData: null, ownersError: true });
      expect(stateForSafeCreation()).toEqual(OWNERS_FAILED);
    });

    it('for Safe creation, does not wait on the owners when the home chain already has a Safe', () => {
      given({
        masterSafes: [SAFE],
        ownersData: null,
        ownersError: true,
        homeChainId: EvmChainIdMap.Gnosis,
      });
      expect(stateForSafeCreation()).toEqual({
        state: 'ready',
        backupSignerAddress: undefined,
      });
    });

    it('for Safe creation, stays ready when a refresh fails after the owners were read', () => {
      given({
        masterSafes: [SAFE],
        owners: [BACKUP_SIGNER_ADDRESS_2],
        ownersError: true,
      });
      expect(stateForSafeCreation()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
      });
    });

    it('for Safe creation, waits for the wallets (and reports a failed read) with no stored pick', () => {
      given({ walletsLoaded: false });
      expect(stateForSafeCreation()).toEqual({ state: 'pending' });

      given({ walletsLoaded: false, walletsError: true });
      expect(stateForSafeCreation()).toEqual(WALLETS_FAILED);
    });

    it('for routing, never waits on the wallets or owners with no stored pick (as before)', () => {
      given({ masterSafes: [SAFE], ownersData: null, ownersError: true });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: undefined,
      });

      given({ walletsLoaded: false, walletsError: true });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: undefined,
      });
    });

    it('prefers a stored address pick over the on-chain owner', () => {
      given({
        pick: manualPick,
        masterSafes: [SAFE],
        owners: [BACKUP_SIGNER_ADDRESS_2],
      });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS,
      });
    });

    it('is ready with no address when there is none at all', () => {
      given({});
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: undefined,
      });
    });
  });

  describe.each(['loading', 'disabled'] as const)(
    'while Web3Auth is %s',
    (status) => {
      it('does not hold up a user with no stored pick', () => {
        given({
          status,
          masterSafes: [SAFE],
          owners: [BACKUP_SIGNER_ADDRESS_2],
        });
        expect(state()).toEqual({
          state: 'ready',
          backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
        });
      });

      it('does not hold up a stored address pick', () => {
        given({ status, pick: manualPick });
        expect(state()).toEqual({
          state: 'ready',
          backupSignerAddress: BACKUP_SIGNER_ADDRESS,
        });
      });
    },
  );

  it('holds a Google/Apple pick as pending while the status loads', () => {
    given({ status: 'loading', pick: web3AuthPick });
    expect(state()).toEqual({ state: 'pending' });
  });

  describe('a Google/Apple pick while Web3Auth is disabled', () => {
    it('stays pending while the wallets are unknown (loading or failed)', () => {
      given({ status: 'disabled', pick: web3AuthPick, walletsLoaded: false });
      expect(state()).toEqual({ state: 'pending' });
    });

    it('needs a new backup when there is no Pearl Safe yet', () => {
      given({ status: 'disabled', pick: web3AuthPick });
      expect(state()).toEqual({ state: 'needsNewBackup' });
    });

    it('uses the on-chain backup owner once a Safe exists', () => {
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        owners: [BACKUP_SIGNER_ADDRESS_2],
      });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
      });
    });

    it('does not reset a user who already has a Pearl Safe, even with no backup owner on-chain', () => {
      // The home chain's Safe exists, so no Safe is created here either.
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        owners: [],
        homeChainId: EvmChainIdMap.Gnosis,
      });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: undefined,
      });
      expect(stateForSafeCreation()).toEqual({
        state: 'ready',
        backupSignerAddress: undefined,
      });
    });

    it('reports a failed wallets read as an error, not an endless wait', () => {
      given({
        status: 'disabled',
        pick: web3AuthPick,
        walletsLoaded: false,
        walletsError: true,
      });
      expect(state()).toEqual(WALLETS_FAILED);
    });

    it('for Safe creation, stays pending while the Safe owners load; routing goes on', () => {
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        ownersData: null,
      });
      expect(stateForSafeCreation()).toEqual({ state: 'pending' });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: undefined,
      });
    });

    it('reports an error, not "no backup", when the Safe owners read failed', () => {
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        ownersData: null,
        ownersError: true,
      });
      expect(stateForSafeCreation()).toEqual(OWNERS_FAILED);
    });

    it('for Safe creation, needs a new backup rather than a Safe with none; routing goes on', () => {
      // A Safe on another chain lists no backup owner, and the home chain has no Safe yet.
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        owners: [],
      });
      expect(stateForSafeCreation()).toEqual({ state: 'needsNewBackup' });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: undefined,
      });
    });

    it('stays ready when a refresh fails after the owners were read', () => {
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        owners: [BACKUP_SIGNER_ADDRESS_2],
        ownersError: true,
      });
      expect(stateForSafeCreation()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
      });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
      });
    });

    it('reads a pick the setup context has not restored yet from the store', () => {
      given({ status: 'disabled', storedPick: web3AuthPick });
      expect(state()).toEqual({ state: 'needsNewBackup' });
    });

    it('prefers the setup context pick over a stale stored Google/Apple pick', () => {
      given({ status: 'disabled', pick: manualPick, storedPick: web3AuthPick });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS,
      });
    });

    it('stays pending until the store has loaded', () => {
      given({ status: 'disabled', storeLoaded: false });
      expect(state()).toEqual({ state: 'pending' });
    });
  });
});

describe('useBackupSignerGuard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a user who needs a new backup to the backup step', () => {
    given({ status: 'disabled', pick: web3AuthPick });

    const { result } = renderHook(() => useBackupSignerGuard());
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.SetupBackupSigner);
    expect(result.current.latchedSigner).toBeNull();
  });

  it('waits, without redirecting, while pending, then redirects once it settles', () => {
    given({ status: 'loading', pick: web3AuthPick });
    const { rerender, result } = renderHook(() => useBackupSignerGuard());
    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.current.latchedSigner).toBeNull();

    given({ status: 'disabled', pick: web3AuthPick });
    rerender();
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.SetupBackupSigner);
  });

  it('reports an unreadable owners read as an error', () => {
    given({
      status: 'disabled',
      pick: web3AuthPick,
      masterSafes: [SAFE],
      ownersData: null,
      ownersError: true,
    });

    const { result } = renderHook(() => useBackupSignerGuard());
    expect(result.current.isBackupSignerError).toBe(true);
    expect(result.current.latchedSigner).toBeNull();
    // An RPC blip must never send an existing-Safe user to the owner-swap step.
    expect(mockGoto).not.toHaveBeenCalled();
  });

  it('keeps the first ready decision and its address after the status turns disabled', () => {
    given({ status: 'enabled', pick: web3AuthPick });
    const { result, rerender } = renderHook(() => useBackupSignerGuard());
    expect(result.current).toEqual({
      latchedSigner: {
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS,
      },
      isBackupSignerError: false,
    });

    given({ status: 'disabled', pick: web3AuthPick });
    rerender();
    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      latchedSigner: {
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS,
      },
      isBackupSignerError: false,
    });
  });

  it("logs an unreadable signer to Pearl's logs once per failing spell, naming the read", () => {
    const failing = {
      status: 'disabled' as const,
      pick: web3AuthPick,
      masterSafes: [SAFE],
      ownersData: null,
      ownersError: true,
    };
    given(failing);
    const { rerender } = renderHook(() => useBackupSignerGuard());
    rerender();
    rerender();
    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith(
      `Backup signer unavailable during setup: ${OWNERS_ERROR}`,
    );

    given({ ...failing, ownersError: false });
    rerender();
    given(failing);
    rerender();
    expect(mockLogEvent).toHaveBeenCalledTimes(2);
  });

  it('keeps a latched signer, with no error, when a later owners read fails', () => {
    const ready = {
      status: 'disabled' as const,
      pick: web3AuthPick,
      masterSafes: [SAFE],
      owners: [BACKUP_SIGNER_ADDRESS_2],
    };
    given(ready);
    const { result, rerender } = renderHook(() => useBackupSignerGuard());
    const latched = {
      state: 'ready',
      backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
    };
    expect(result.current.latchedSigner).toEqual(latched);

    given({ ...ready, ownersData: null, ownersError: true });
    rerender();
    expect(result.current).toEqual({
      latchedSigner: latched,
      isBackupSignerError: false,
    });
  });

  it('does not latch a missing owner: with no pick, it waits for the Safe owners and latches the on-chain one', () => {
    given({ masterSafes: [SAFE], ownersData: null });
    const { result, rerender } = renderHook(() => useBackupSignerGuard());
    expect(result.current.latchedSigner).toBeNull();

    given({ masterSafes: [SAFE], owners: [BACKUP_SIGNER_ADDRESS_2] });
    rerender();
    expect(result.current.latchedSigner).toEqual({
      state: 'ready',
      backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
    });
  });
});
