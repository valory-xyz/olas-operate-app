import { renderHook } from '@testing-library/react';

import { useBackupOwnerStatus } from '../../hooks/useBackupOwnerStatus';
import { useBackupWalletUpdatePrompt } from '../../hooks/useBackupWalletUpdatePrompt';
import { useStore } from '../../hooks/useStore';
import { useWeb3AuthStatus } from '../../hooks/useWeb3AuthStatus';
import { BackupWalletType } from '../../types/BackupWallet';
import {
  BACKUP_SIGNER_ADDRESS,
  BACKUP_SIGNER_ADDRESS_2,
} from '../helpers/factories';

jest.mock('../../hooks/useWeb3AuthStatus', () => ({
  useWeb3AuthStatus: jest.fn(),
}));
jest.mock('../../hooks/useStore', () => ({ useStore: jest.fn() }));
jest.mock('../../hooks/useBackupOwnerStatus', () => ({
  useBackupOwnerStatus: jest.fn(),
}));

const mockUseWeb3AuthStatus = useWeb3AuthStatus as jest.Mock;
const mockUseStore = useStore as jest.Mock;
const mockUseBackupOwnerStatus = useBackupOwnerStatus as jest.Mock;

const setup = ({
  isWeb3AuthEnabled = false,
  isLoading = false,
  record = { address: BACKUP_SIGNER_ADDRESS, type: 'web3auth' },
  canonical = BACKUP_SIGNER_ADDRESS,
}: {
  isWeb3AuthEnabled?: boolean;
  isLoading?: boolean;
  /** `null` = this device has no record */
  record?: { address: string | null; type: BackupWalletType } | null;
  canonical?: string | null;
} = {}) => {
  mockUseWeb3AuthStatus.mockReturnValue({ isWeb3AuthEnabled, isLoading });
  mockUseStore.mockReturnValue({
    storeState: { lastProvidedBackupWallet: record ?? undefined },
  });
  mockUseBackupOwnerStatus.mockReturnValue({
    backupOwnerStatus:
      canonical === undefined
        ? undefined
        : { canonical_backup_owner: canonical },
  });
  return renderHook(() => useBackupWalletUpdatePrompt()).result.current
    .isUpdatePromptVisible;
};

describe('useBackupWalletUpdatePrompt', () => {
  it('shows when disabled, the record is Google/Apple and it is still the backup wallet', () => {
    expect(setup()).toBe(true);
  });

  it('compares addresses case-insensitively', () => {
    expect(setup({ canonical: BACKUP_SIGNER_ADDRESS.toLowerCase() })).toBe(
      true,
    );
  });

  it('hides when Web3Auth is enabled', () => {
    expect(setup({ isWeb3AuthEnabled: true })).toBe(false);
  });

  it('hides while the Web3Auth status is loading', () => {
    expect(setup({ isLoading: true })).toBe(false);
  });

  it('hides once the backup wallet has changed', () => {
    expect(setup({ canonical: BACKUP_SIGNER_ADDRESS_2 })).toBe(false);
  });

  it('hides for a backup set up with an address', () => {
    expect(
      setup({ record: { address: BACKUP_SIGNER_ADDRESS, type: 'manual' } }),
    ).toBe(false);
  });

  it('hides when this device has no record', () => {
    expect(setup({ record: null })).toBe(false);
  });

  it('hides when there is no backup wallet', () => {
    expect(setup({ canonical: null })).toBe(false);
  });

  it('hides while the backup owner status is unknown', () => {
    mockUseBackupOwnerStatus.mockReturnValue({ backupOwnerStatus: undefined });
    mockUseWeb3AuthStatus.mockReturnValue({
      isWeb3AuthEnabled: false,
      isLoading: false,
    });
    mockUseStore.mockReturnValue({
      storeState: {
        lastProvidedBackupWallet: {
          address: BACKUP_SIGNER_ADDRESS,
          type: 'web3auth',
        },
      },
    });
    expect(
      renderHook(() => useBackupWalletUpdatePrompt()).result.current
        .isUpdatePromptVisible,
    ).toBe(false);
  });
});
