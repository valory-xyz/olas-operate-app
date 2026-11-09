import { renderHook } from '@testing-library/react';

import { SETUP_SCREEN } from '../../constants/setupScreen';
import {
  useBackupSigner,
  useBackupSignerGuard,
  useBackupSignerState,
} from '../../hooks/useBackupSigner';
import { useMultisigs } from '../../hooks/useMultisig';
import { useSetup } from '../../hooks/useSetup';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { useWeb3AuthStatus } from '../../hooks/useWeb3AuthStatus';
import {
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
  DEFAULT_SAFE_ADDRESS,
} from '../helpers/factories';

jest.mock('../../hooks/useSetup', () => ({ useSetup: jest.fn() }));
jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../hooks/useMultisig', () => ({ useMultisigs: jest.fn() }));
jest.mock('../../hooks/useWeb3AuthStatus', () => ({
  useWeb3AuthStatus: jest.fn(),
}));

const mockUseSetup = useSetup as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseMultisigs = useMultisigs as jest.Mock;
const mockUseWeb3AuthStatus = useWeb3AuthStatus as jest.Mock;
const mockGoto = jest.fn();

const SAFE = { address: DEFAULT_SAFE_ADDRESS, evmChainId: 100 };
const web3AuthPick = { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' };
const manualPick = { address: BACKUP_SIGNER_ADDRESS, type: 'manual' };

const given = ({
  status = 'enabled',
  pick,
  masterSafes = [],
  walletsLoaded = true,
  owners = [],
  ownersSuccess = true,
  ownersError = false,
}: {
  status?: 'loading' | 'enabled' | 'disabled';
  pick?: { address: string; type: string };
  masterSafes?: unknown[];
  walletsLoaded?: boolean;
  owners?: string[];
  ownersSuccess?: boolean;
  ownersError?: boolean;
}) => {
  mockUseWeb3AuthStatus.mockReturnValue({ status });
  mockUseSetup.mockReturnValue({ goto: mockGoto, backupSigner: pick });
  mockUseMasterWalletContext.mockReturnValue({
    masterWallets: walletsLoaded ? masterSafes : undefined,
    masterSafes: walletsLoaded ? masterSafes : undefined,
  });
  mockUseMultisigs.mockReturnValue({
    allBackupAddresses: owners,
    masterSafesOwnersIsSuccess: ownersSuccess,
    masterSafesOwnersIsError: ownersError,
  });
};

const state = () => renderHook(() => useBackupSignerState()).result.current;

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
      given({ owners: [BACKUP_SIGNER_ADDRESS_2] });
      expect(state()).toEqual({
        state: 'ready',
        backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
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

    it('needs a new backup when the Safe has no backup owner on-chain', () => {
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        owners: [],
      });
      expect(state()).toEqual({ state: 'needsNewBackup' });
    });

    it('stays pending while the Safe owners load', () => {
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        ownersSuccess: false,
      });
      expect(state()).toEqual({ state: 'pending' });
    });

    it('reports an error, not "no backup", when the Safe owners read failed', () => {
      given({
        status: 'disabled',
        pick: web3AuthPick,
        masterSafes: [SAFE],
        ownersSuccess: false,
        ownersError: true,
      });
      expect(state()).toEqual({ state: 'error' });
    });
  });

  it('useBackupSigner returns the address only when ready', () => {
    given({ pick: web3AuthPick });
    expect(renderHook(() => useBackupSigner()).result.current).toBe(
      BACKUP_SIGNER_ADDRESS,
    );

    given({ status: 'loading', pick: web3AuthPick });
    expect(renderHook(() => useBackupSigner()).result.current).toBeUndefined();
  });
});

describe('useBackupSignerGuard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a user who needs a new backup to the backup step', () => {
    given({ status: 'disabled', pick: web3AuthPick });

    const { result } = renderHook(() => useBackupSignerGuard());
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.SetupBackupSigner);
    expect(result.current.isBackupSignerReady).toBe(false);
  });

  it('waits, without redirecting, while pending, then redirects once it settles', () => {
    given({ status: 'loading', pick: web3AuthPick });
    const { rerender, result } = renderHook(() => useBackupSignerGuard());
    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.current.isBackupSignerReady).toBe(false);

    given({ status: 'disabled', pick: web3AuthPick });
    rerender();
    expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.SetupBackupSigner);
  });

  it('reports an unreadable owners read as an error', () => {
    given({
      status: 'disabled',
      pick: web3AuthPick,
      masterSafes: [SAFE],
      ownersSuccess: false,
      ownersError: true,
    });

    const { result } = renderHook(() => useBackupSignerGuard());
    expect(result.current.isBackupSignerError).toBe(true);
    expect(result.current.isBackupSignerReady).toBe(false);
  });

  it('keeps the first ready decision and its address after the status turns disabled', () => {
    given({ status: 'enabled', pick: web3AuthPick });
    const { result, rerender } = renderHook(() => useBackupSignerGuard());
    expect(result.current).toEqual({
      isBackupSignerReady: true,
      isBackupSignerError: false,
      backupSignerAddress: BACKUP_SIGNER_ADDRESS,
    });

    given({ status: 'disabled', pick: web3AuthPick });
    rerender();
    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      isBackupSignerReady: true,
      isBackupSignerError: false,
      backupSignerAddress: BACKUP_SIGNER_ADDRESS,
    });
  });
});
