import { renderHook } from '@testing-library/react';
import { getAddress } from 'ethers/lib/utils';
import { act } from 'react';

import { useApplyBackupDuringSetup } from '../../hooks/useApplyBackupDuringSetup';
import {
  BackupWalletError,
  BackupWalletErrorCode,
} from '../../service/BackupWalletService';
import { Address } from '../../types/Address';

jest.mock('../../constants/providers', () => ({}));

const mockApplyBackupOwner = jest.fn();
const mockSetPassword = jest.fn();
let mockPassword: string | null = 'hunter2';

jest.mock('../../hooks/useApplyBackupOwner', () => ({
  useApplyBackupOwner: () => ({ mutateAsync: mockApplyBackupOwner }),
}));

jest.mock('../../hooks/useSetup', () => ({
  useSetup: () => ({
    password: mockPassword,
    setPassword: mockSetPassword,
  }),
}));

// Source-of-truth EIP-55 checksum for the test address — computed from ethers
// directly so we don't hand-write a checksum that might drift.
const RAW_LOWER = '0xaa72b201fc49e0837648d5c8a89fced3eab1364f';
const CHECKSUMMED = getAddress(RAW_LOWER) as Address;

describe('useApplyBackupDuringSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPassword = 'hunter2';
  });

  it('calls applyBackupOwner with checksummed address and password from context', async () => {
    mockApplyBackupOwner.mockResolvedValueOnce({
      canonical_backup_owner: CHECKSUMMED,
      results: [],
      all_succeeded: true,
    });

    const { result } = renderHook(() => useApplyBackupDuringSetup());

    await act(async () => {
      await result.current(CHECKSUMMED);
    });

    expect(mockApplyBackupOwner).toHaveBeenCalledTimes(1);
    const arg = mockApplyBackupOwner.mock.calls[0][0];
    expect(arg.backup_owner).toBe(CHECKSUMMED);
    expect(arg.password).toBe('hunter2');
  });

  it('checksums a lowercased address before sending', async () => {
    mockApplyBackupOwner.mockResolvedValueOnce({});

    const { result } = renderHook(() => useApplyBackupDuringSetup());
    await act(async () => {
      await result.current(CHECKSUMMED.toLowerCase() as Address);
    });

    const arg = mockApplyBackupOwner.mock.calls[0][0];
    expect(arg.backup_owner).toBe(CHECKSUMMED);
  });

  it('clears password from context after successful apply', async () => {
    mockApplyBackupOwner.mockResolvedValueOnce({});

    const { result } = renderHook(() => useApplyBackupDuringSetup());
    await act(async () => {
      await result.current(CHECKSUMMED);
    });

    expect(mockSetPassword).toHaveBeenCalledWith(null);
  });

  it('is a silent no-op when password is not set (interrupted setup)', async () => {
    mockPassword = null;

    const { result } = renderHook(() => useApplyBackupDuringSetup());
    await act(async () => {
      await result.current(CHECKSUMMED);
    });

    expect(mockApplyBackupOwner).not.toHaveBeenCalled();
    expect(mockSetPassword).not.toHaveBeenCalled();
  });

  it('treats ALREADY_LINKED as success (clears password, no throw)', async () => {
    mockApplyBackupOwner.mockRejectedValueOnce(
      new BackupWalletError('Wallet Already Linked', 'ALREADY_LINKED'),
    );

    const { result } = renderHook(() => useApplyBackupDuringSetup());
    await act(async () => {
      await expect(result.current(CHECKSUMMED)).resolves.toBeUndefined();
    });

    expect(mockSetPassword).toHaveBeenCalledWith(null);
  });

  it.each<BackupWalletErrorCode>(['PARTIAL_FAILURE', 'NETWORK_ERROR'])(
    'propagates %s errors so the caller can show a toast',
    async (code) => {
      mockApplyBackupOwner.mockRejectedValueOnce(
        new BackupWalletError('boom', code),
      );

      const { result } = renderHook(() => useApplyBackupDuringSetup());
      await act(async () => {
        await expect(result.current(CHECKSUMMED)).rejects.toMatchObject({
          code,
        });
      });

      // Password is NOT cleared on non-ALREADY_LINKED errors — the caller
      // may want to retry with the same password.
      expect(mockSetPassword).not.toHaveBeenCalled();
    },
  );

  it('propagates non-BackupWalletError errors unchanged', async () => {
    const unknown = new Error('unknown');
    mockApplyBackupOwner.mockRejectedValueOnce(unknown);

    const { result } = renderHook(() => useApplyBackupDuringSetup());
    await act(async () => {
      await expect(result.current(CHECKSUMMED)).rejects.toBe(unknown);
    });

    expect(mockSetPassword).not.toHaveBeenCalled();
  });
});
