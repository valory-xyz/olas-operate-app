import { renderHook } from '@testing-library/react';

import { useBackupSigner } from '../../hooks/useBackupSigner';
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
    mockUseMasterWalletContext.mockReturnValue({ masterSafes: [] });
    mockUseWeb3AuthStatus.mockReturnValue({
      isWeb3AuthEnabled: true,
      isLoading: false,
    });
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
    beforeEach(() => {
      mockUseWeb3AuthStatus.mockReturnValue({
        isWeb3AuthEnabled: false,
        isLoading: false,
      });
    });

    it('ignores a stored Google/Apple pick when no Pearl Safe exists yet', () => {
      mockUseSetup.mockReturnValue({
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSigner());
      expect(result.current).toBeUndefined();
    });

    it('uses the on-chain backup owner instead of a stored Google/Apple pick', () => {
      mockUseSetup.mockReturnValue({
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
      });
      mockUseMultisigs.mockReturnValue({
        allBackupAddresses: [BACKUP_SIGNER_ADDRESS_2],
      });

      const { result } = renderHook(() => useBackupSigner());
      expect(result.current).toBe(BACKUP_SIGNER_ADDRESS_2);
    });

    it('keeps a stored Google/Apple pick while the status is still loading', () => {
      mockUseWeb3AuthStatus.mockReturnValue({
        isWeb3AuthEnabled: false,
        isLoading: true,
      });
      mockUseSetup.mockReturnValue({
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSigner());
      expect(result.current).toBe(BACKUP_SIGNER_ADDRESS);
    });

    it('keeps a stored address pick', () => {
      mockUseSetup.mockReturnValue({
        backupSigner: { address: BACKUP_SIGNER_ADDRESS, type: 'manual' },
      });
      mockUseMultisigs.mockReturnValue({ allBackupAddresses: [] });

      const { result } = renderHook(() => useBackupSigner());
      expect(result.current).toBe(BACKUP_SIGNER_ADDRESS);
    });
  });
});
