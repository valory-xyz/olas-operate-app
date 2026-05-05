import { MiddlewareChainMap } from '../../constants/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL } from '../../constants/urls';
import { WalletService } from '../../service/Wallet';
import {
  GNOSIS_SAFE_ADDRESS,
  MOCK_BACKUP_OWNER,
  MOCK_TX_HASH_1,
  SECOND_SAFE_ADDRESS,
} from '../helpers/factories';

const mockJsonResponse = (body: unknown, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);

beforeEach(() => {
  global.fetch = jest.fn();
  jest.restoreAllMocks();
});

describe('WalletService', () => {
  const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

  describe('getWallets', () => {
    it('returns wallets on success', async () => {
      const walletResponse = [
        {
          address: SECOND_SAFE_ADDRESS,
          safes: {
            polygon: GNOSIS_SAFE_ADDRESS,
          },
          safe_chains: ['polygon'],
          ledger_type: 'ethereum',
          safe_nonce: 123456,
        },
      ];
      const controller = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(walletResponse));

      const result = await WalletService.getWallets(controller.signal);
      expect(result).toEqual(walletResponse);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/wallet`, {
        signal: controller.signal,
      });
    });

    it('passes the AbortSignal to fetch', async () => {
      const controller = new AbortController();
      jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse([]));

      await WalletService.getWallets(controller.signal);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('throws error on non-ok response', async () => {
      const controller = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(WalletService.getWallets(controller.signal)).rejects.toThrow(
        'Failed to fetch wallets',
      );
    });
  });

  describe('createEoa', () => {
    it('sends ledger_type ethereum and returns response on success', async () => {
      const responseBody = {
        wallet: {
          address: SECOND_SAFE_ADDRESS,
          ledger_type: 'ethereum',
          safe_chains: [],
          safes: {},
        },
        mnemonic: ['creek', 'salute', 'fury'],
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await WalletService.createEoa();
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/wallet`, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify({ ledger_type: 'ethereum' }),
      });
    });

    it('returns null mnemonic when wallet already exists', async () => {
      const responseBody = {
        wallet: {
          address: SECOND_SAFE_ADDRESS,
        },
        mnemonic: null,
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await WalletService.createEoa();
      expect(result.mnemonic).toBeNull();
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(WalletService.createEoa()).rejects.toThrow(
        'Failed to create EOA',
      );
    });
  });

  describe('createSafe', () => {
    it('sends chain and backup_owner and returns response on success', async () => {
      const responseBody = {
        status: 'SAFE_CREATED_TRANSFER_COMPLETED',
        safe: GNOSIS_SAFE_ADDRESS,
        create_tx: MOCK_TX_HASH_1,
        transfer_txs: {},
        transfer_errors: {},
        message: 'Safe created and funded successfully.',
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await WalletService.createSafe(
        MiddlewareChainMap.POLYGON,
        MOCK_BACKUP_OWNER,
      );
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/wallet/safe`, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify({
          chain: MiddlewareChainMap.POLYGON,
          backup_owner: MOCK_BACKUP_OWNER,
          transfer_excess_assets: true,
        }),
      });
    });

    it('sends undefined backup_owner when not provided', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(
          mockJsonResponse({ status: 'SAFE_CREATED_TRANSFER_COMPLETED' }),
        );

      await WalletService.createSafe(MiddlewareChainMap.GNOSIS);
      const parsedBody = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
      expect(parsedBody.chain).toBe(MiddlewareChainMap.GNOSIS);
      expect(parsedBody.transfer_excess_assets).toBe(true);
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        WalletService.createSafe(MiddlewareChainMap.GNOSIS),
      ).rejects.toThrow('Failed to create safe');
    });
  });

  describe('updateSafeBackupOwner', () => {
    it('sends chain and backup_owner and returns response on success', async () => {
      const responseBody = {
        wallet: {
          address: SECOND_SAFE_ADDRESS,
        },
        chain: 'polygon',
        backup_owner_updated: true,
        message: 'Backup owner updated successfully.',
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await WalletService.updateSafeBackupOwner(
        MiddlewareChainMap.POLYGON,
        MOCK_BACKUP_OWNER,
      );
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/wallet/safe`, {
        method: 'PUT',
        headers: expectedHeaders,
        body: JSON.stringify({
          chain: MiddlewareChainMap.POLYGON,
          backup_owner: MOCK_BACKUP_OWNER,
        }),
      });
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        WalletService.updateSafeBackupOwner(
          MiddlewareChainMap.GNOSIS,
          MOCK_BACKUP_OWNER,
        ),
      ).rejects.toThrow('Failed to add backup owner');
    });
  });

  describe('getRecoverySeedPhrase', () => {
    it('sends password and returns mnemonic on success', async () => {
      const responseBody = {
        mnemonic: ['creek', 'salute', 'fury', 'panel'],
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await WalletService.getRecoverySeedPhrase('mypassword');
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/wallet/mnemonic`, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify({
          ledger_type: 'ethereum',
          password: 'mypassword',
        }),
      });
    });

    it('throws parsed API error on failure (uses parseApiError, not generic)', async () => {
      const errorBody = { error: 'Invalid credentials' };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(errorBody, false, 401));

      // Per feature doc: error message is "Failed to login" (copy-paste artifact)
      // but parseApiError will prefer the "error" field from response body
      await expect(
        WalletService.getRecoverySeedPhrase('wrongpass'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('throws fallback "Failed to login" when response has no error field', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        WalletService.getRecoverySeedPhrase('password'),
      ).rejects.toThrow('Failed to login');
    });
  });
});
