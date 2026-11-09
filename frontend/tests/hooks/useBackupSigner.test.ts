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

jest.mock('../../hooks/useSetup', () => ({
  useSetup: jest.fn(),
}));

jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));

jest.mock('../../hooks/useMultisig', () => ({
  useMultisigs: jest.fn(),
}));

jest.mock('../../hooks/useWeb3AuthStatus', () => ({
  useWeb3AuthStatus: jest.fn(),
}));

const mockUseSetup = useSetup as jest.Mock;
const mockUseMasterWalletContext = useMasterWalletContext as jest.Mock;
const mockUseMultisigs = useMultisigs as jest.Mock;
const mockUseWeb3AuthStatus = useWeb3AuthStatus as jest.Mock;

describe('useBackupSigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMasterWalletContext.mockReturnValue({
      masterSafes: [],
      isFetched: true,
    });
    mockUseWeb3AuthStatus.mockReturnValue({ status: 'enabled' });
  });

  it('returns setup backupSigner address when available', () => {
    mockUseSetup.mockReturnValue({
      backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
    });
    mockUseMultisigs.mockReturnValue({
      allBackupAddresses: [BACKUP_SIGNER_ADDRESS, BACKUP_SIGNER_ADDRESS_2],
    });

    const { result } = renderHook(() => useBackupSigner());
    expect(result.current).toBe(BACKUP_SIGNER_ADDRESS);
  });

  it('falls back to first on-chain backup address when setup has no signer', () => {
    mockUseSetup.mockReturnValue({ backupSigner: undefined });
    mockUseMultisigs.mockReturnValue({
      allBackupAddresses: [BACKUP_SIGNER_ADDRESS_2],
    });

    const { result } = renderHook(() => useBackupSigner());
    expect(result.current).toBe(BACKUP_SIGNER_ADDRESS_2);
  });

  it('returns undefined when neither setup signer nor on-chain addresses exist', () => {
    mockUseSetup.mockReturnValue({ backupSigner: undefined });
    mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

    const { result } = renderHook(() => useBackupSigner());
    expect(result.current).toBeUndefined();
  });

  it('prefers setup signer over on-chain addresses (setup takes priority)', () => {
    mockUseSetup.mockReturnValue({
      backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'manual' },
    });
    mockUseMultisigs.mockReturnValue({
      allBackupAddresses: [BACKUP_SIGNER_ADDRESS_2],
    });

    const { result } = renderHook(() => useBackupSigner());
    // Setup signer address wins over on-chain
    expect(result.current).toBe(BACKUP_SIGNER_ADDRESS);
    expect(result.current).not.toBe(BACKUP_SIGNER_ADDRESS_2);
  });

  it('passes masterSafes to useMultisigs', () => {
    const mockSafes = [{ address: DEFAULT_SAFE_ADDRESS, evmChainId: 100 }];
    mockUseMasterWalletContext.mockReturnValue({ masterSafes: mockSafes });
    mockUseSetup.mockReturnValue({ backupSigner: undefined });
    mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

    renderHook(() => useBackupSigner());
    expect(mockUseMultisigs).toHaveBeenCalledWith(mockSafes);
  });

  describe('when Web3Auth is disabled', () => {
    const SAFE = { address: DEFAULT_SAFE_ADDRESS, evmChainId: 100 };
    const web3AuthPick = {
      backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
    };

    beforeEach(() => {
      mockUseWeb3AuthStatus.mockReturnValue({ status: 'disabled' });
    });

    it('asks for a new backup when a Google/Apple pick has no Pearl Safe yet', () => {
      mockUseSetup.mockReturnValue(web3AuthPick);
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current).toEqual({
        backupSignerAddress: undefined,
        isPending: false,
        needsNewBackup: true,
      });
    });

    it('uses the on-chain backup owner instead of a Google/Apple pick once a Safe exists', () => {
      mockUseSetup.mockReturnValue(web3AuthPick);
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [SAFE],
        isFetched: true,
      });
      mockUseMultisigs.mockReturnValue({
        allBackupAddresses: [BACKUP_SIGNER_ADDRESS_2],
        masterSafesOwnersIsSuccess: true,
      });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current).toEqual({
        backupSignerAddress: BACKUP_SIGNER_ADDRESS_2,
        isPending: false,
        needsNewBackup: false,
      });
    });

    it('stays pending until the Safe owners are read successfully (loading or failed)', () => {
      mockUseSetup.mockReturnValue(web3AuthPick);
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [SAFE],
        isFetched: true,
      });
      mockUseMultisigs.mockReturnValue({
        allBackupAddresses: [],
        masterSafesOwnersIsSuccess: false,
      });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current.isPending).toBe(true);
      expect(result.current.needsNewBackup).toBe(false);
      expect(result.current.backupSignerAddress).toBeUndefined();
    });

    it('stays pending, rather than settling with no backup, when the Safe owners read failed', () => {
      mockUseSetup.mockReturnValue(web3AuthPick);
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [SAFE],
        isFetched: true,
      });
      // A failed query is "fetched" but not "success".
      mockUseMultisigs.mockReturnValue({
        allBackupAddresses: [],
        masterSafesOwnersIsFetched: true,
        masterSafesOwnersIsSuccess: false,
      });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current).toEqual({
        backupSignerAddress: undefined,
        isPending: true,
        needsNewBackup: false,
      });
    });

    it('asks for a new backup when an existing Safe has no backup owner on-chain', () => {
      mockUseSetup.mockReturnValue(web3AuthPick);
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: [SAFE],
        isFetched: true,
      });
      mockUseMultisigs.mockReturnValue({
        allBackupAddresses: [],
        masterSafesOwnersIsSuccess: true,
      });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current).toEqual({
        backupSignerAddress: undefined,
        isPending: false,
        needsNewBackup: true,
      });
    });

    it('stays pending while the wallets load', () => {
      mockUseSetup.mockReturnValue(web3AuthPick);
      mockUseMasterWalletContext.mockReturnValue({
        masterSafes: undefined,
        isFetched: false,
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current.isPending).toBe(true);
      expect(result.current.needsNewBackup).toBe(false);
    });

    it('keeps a stored address pick', () => {
      mockUseSetup.mockReturnValue({
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'manual' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current).toEqual({
        backupSignerAddress: BACKUP_SIGNER_ADDRESS,
        isPending: false,
        needsNewBackup: false,
      });
    });
  });

  describe('while the Web3Auth status is loading', () => {
    beforeEach(() => {
      mockUseWeb3AuthStatus.mockReturnValue({ status: 'loading' });
    });

    it('holds a Google/Apple pick as pending, with no address to route or create a Safe on', () => {
      mockUseSetup.mockReturnValue({
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current).toEqual({
        backupSignerAddress: undefined,
        isPending: true,
        needsNewBackup: false,
      });
    });

    it('does not hold up an address pick', () => {
      mockUseSetup.mockReturnValue({
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'manual' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSignerState());
      expect(result.current.isPending).toBe(false);
      expect(result.current.backupSignerAddress).toBe(BACKUP_SIGNER_ADDRESS);
    });
  });

  it('useBackupSigner returns the state address', () => {
    mockUseSetup.mockReturnValue({
      backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
    });
    mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

    const { result } = renderHook(() => useBackupSigner());
    expect(result.current).toBe(BACKUP_SIGNER_ADDRESS);
  });

  describe('useBackupSignerGuard', () => {
    const mockGoto = jest.fn();

    beforeEach(() => mockGoto.mockClear());

    it('sends a user whose Google/Apple pick was ignored, with no Safe, back to the backup step', () => {
      mockUseWeb3AuthStatus.mockReturnValue({ status: 'disabled' });
      mockUseSetup.mockReturnValue({
        goto: mockGoto,
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSignerGuard());
      expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.SetupBackupSigner);
      expect(result.current.isBackupSignerReady).toBe(false);
    });

    it('is not ready, and does not redirect, while pending', () => {
      mockUseWeb3AuthStatus.mockReturnValue({ status: 'loading' });
      mockUseSetup.mockReturnValue({
        goto: mockGoto,
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSignerGuard());
      expect(mockGoto).not.toHaveBeenCalled();
      expect(result.current.isBackupSignerReady).toBe(false);
    });

    it('redirects once a pending signer settles as needing a new backup', () => {
      mockUseSetup.mockReturnValue({
        goto: mockGoto,
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });
      mockUseWeb3AuthStatus.mockReturnValue({ status: 'loading' });

      const { rerender } = renderHook(() => useBackupSignerGuard());
      expect(mockGoto).not.toHaveBeenCalled();

      mockUseWeb3AuthStatus.mockReturnValue({ status: 'disabled' });
      rerender();
      expect(mockGoto).toHaveBeenCalledWith(SETUP_SCREEN.SetupBackupSigner);
    });

    it('stays ready, without redirecting, if the status turns disabled after the screen was ready', () => {
      mockUseSetup.mockReturnValue({
        goto: mockGoto,
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });
      mockUseWeb3AuthStatus.mockReturnValue({ status: 'enabled' });

      const { result, rerender } = renderHook(() => useBackupSignerGuard());
      expect(result.current.isBackupSignerReady).toBe(true);

      mockUseWeb3AuthStatus.mockReturnValue({ status: 'disabled' });
      rerender();
      expect(mockGoto).not.toHaveBeenCalled();
      expect(result.current.isBackupSignerReady).toBe(true);
    });

    it('is ready for a settled backup signer', () => {
      mockUseSetup.mockReturnValue({
        goto: mockGoto,
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'manual' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSignerGuard());
      expect(mockGoto).not.toHaveBeenCalled();
      expect(result.current.isBackupSignerReady).toBe(true);
    });
  });
});
