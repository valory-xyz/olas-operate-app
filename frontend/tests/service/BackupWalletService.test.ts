import {
  BackupWalletError,
  BackupWalletService,
} from '../../service/BackupWalletService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = (response: {
  ok: boolean;
  status?: number;
  body: Record<string, unknown>;
}) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 400),
    json: () => Promise.resolve(response.body),
  });
};

// ---------------------------------------------------------------------------
// getBackupOwnerStatus
// ---------------------------------------------------------------------------

describe('BackupWalletService.getBackupOwnerStatus', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns status on success', async () => {
    const body = {
      canonical_backup_owner: '0xABC',
      all_chains_synced: true,
      any_backup_missing: false,
      chains: [],
      chains_without_safe: [],
    };
    mockFetch({ ok: true, body });

    const result = await BackupWalletService.getBackupOwnerStatus();
    expect(result).toEqual(body);
  });

  it('throws on HTTP error', async () => {
    mockFetch({ ok: false, body: { error: 'Unauthorized' } });

    await expect(BackupWalletService.getBackupOwnerStatus()).rejects.toThrow(
      'Unauthorized',
    );
  });
});

// ---------------------------------------------------------------------------
// applyBackupOwner
// ---------------------------------------------------------------------------

describe('BackupWalletService.applyBackupOwner', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns response when all chains succeed', async () => {
    const body = {
      canonical_backup_owner: '0xABC',
      results: [{ chain: 'gnosis', updated: true, message: 'ok' }],
      all_succeeded: true,
    };
    mockFetch({ ok: true, body });

    const result = await BackupWalletService.applyBackupOwner({
      backup_owner: '0xABC',
    });
    expect(result).toEqual(body);
  });

  it('throws PARTIAL_FAILURE with failed chains when all_succeeded is false', async () => {
    const body = {
      canonical_backup_owner: '0xABC',
      results: [
        { chain: 'gnosis', updated: true, message: 'ok' },
        { chain: 'base', updated: false, message: 'gas estimation failed' },
      ],
      all_succeeded: false,
    };
    mockFetch({ ok: true, body });

    await expect(
      BackupWalletService.applyBackupOwner({ backup_owner: '0xABC' }),
    ).rejects.toMatchObject({
      name: 'BackupWalletError',
      code: 'PARTIAL_FAILURE',
      failedChains: ['base'],
      message: 'Backup owner update failed on chains: base',
    });
  });

  it('throws PARTIAL_FAILURE listing every failed chain', async () => {
    const body = {
      canonical_backup_owner: '0xABC',
      results: [
        { chain: 'gnosis', updated: false, message: 'timeout' },
        { chain: 'base', updated: false, message: 'timeout' },
      ],
      all_succeeded: false,
    };
    mockFetch({ ok: true, body });

    await expect(
      BackupWalletService.applyBackupOwner({ backup_owner: '0xABC' }),
    ).rejects.toMatchObject({
      code: 'PARTIAL_FAILURE',
      failedChains: ['gnosis', 'base'],
    });
  });

  it('throws ALREADY_LINKED on 400 "Wallet Already Linked"', async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: { error: 'Wallet Already Linked' },
    });

    await expect(
      BackupWalletService.applyBackupOwner({ backup_owner: '0xABC' }),
    ).rejects.toMatchObject({
      name: 'BackupWalletError',
      code: 'ALREADY_LINKED',
      message: 'Wallet Already Linked',
    });
  });

  it('throws NETWORK_ERROR on 401 with password error', async () => {
    mockFetch({
      ok: false,
      status: 401,
      body: { error: 'Password is not valid.' },
    });

    await expect(
      BackupWalletService.applyBackupOwner({
        backup_owner: '0xABC',
        password: 'wrong',
      }),
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Password is not valid.',
    });
  });

  it('throws BackupWalletError instances (not plain Error)', async () => {
    mockFetch({
      ok: false,
      status: 500,
      body: { error: 'Internal server error' },
    });

    await expect(
      BackupWalletService.applyBackupOwner({ backup_owner: '0xABC' }),
    ).rejects.toBeInstanceOf(BackupWalletError);
  });

  it('sends chain:all and password in request body', async () => {
    const body = {
      canonical_backup_owner: '0xABC',
      results: [],
      all_succeeded: true,
    };
    mockFetch({ ok: true, body });

    await BackupWalletService.applyBackupOwner({
      backup_owner: '0xABC',
      password: 'secret',
    });

    const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
    const parsed = JSON.parse(fetchOptions.body);
    expect(parsed.chain).toBe('all');
    expect(parsed.backup_owner).toBe('0xABC');
    expect(parsed.password).toBe('secret');
    expect(fetchOptions.method).toBe('PUT');
  });

  it('omits password from body when not provided', async () => {
    const body = {
      canonical_backup_owner: '0xABC',
      results: [],
      all_succeeded: true,
    };
    mockFetch({ ok: true, body });

    await BackupWalletService.applyBackupOwner({ backup_owner: '0xABC' });

    const [, fetchOptions] = (global.fetch as jest.Mock).mock.calls[0];
    const parsed = JSON.parse(fetchOptions.body);
    expect(parsed.password).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// syncBackupOwner
// ---------------------------------------------------------------------------

describe('BackupWalletService.syncBackupOwner', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns response when all chains succeed', async () => {
    const body = {
      canonical_backup_owner: '0xABC',
      results: [{ chain: 'gnosis', updated: true, message: 'ok' }],
      all_succeeded: true,
    };
    mockFetch({ ok: true, body });

    const result = await BackupWalletService.syncBackupOwner();
    expect(result).toEqual(body);
  });

  it('throws PARTIAL_FAILURE with failed chains when all_succeeded is false', async () => {
    const body = {
      canonical_backup_owner: '0xABC',
      results: [
        { chain: 'gnosis', updated: true, message: 'ok' },
        { chain: 'ethereum', updated: false, message: 'rpc timeout' },
      ],
      all_succeeded: false,
    };
    mockFetch({ ok: true, body });

    await expect(BackupWalletService.syncBackupOwner()).rejects.toMatchObject({
      name: 'BackupWalletError',
      code: 'PARTIAL_FAILURE',
      failedChains: ['ethereum'],
      message: 'Backup owner sync failed on chains: ethereum',
    });
  });

  it('throws NETWORK_ERROR on HTTP 400 when no canonical set', async () => {
    mockFetch({
      ok: false,
      status: 400,
      body: { error: 'No canonical backup owner is set.' },
    });

    await expect(BackupWalletService.syncBackupOwner()).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'No canonical backup owner is set.',
    });
  });
});
