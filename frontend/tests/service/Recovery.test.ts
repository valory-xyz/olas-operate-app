import { AddressZero } from '../../constants/address';
import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL } from '../../constants/urls';
import { RecoveryService } from '../../service/Recovery';
import {
  GNOSIS_SAFE_ADDRESS,
  MOCK_BACKUP_OWNER,
  POLYGON_SAFE_ADDRESS,
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

describe('RecoveryService', () => {
  const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

  describe('getRecoveryStatus', () => {
    it('returns recovery status on success', async () => {
      const responseBody = {
        prepared: true,
        bundle_id: 'recovery_bundle_7f3a2b',
        has_swaps: false,
        has_pending_swaps: true,
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await RecoveryService.getRecoveryStatus();
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/wallet/recovery/status`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: undefined,
        },
      );
    });

    it('passes AbortSignal when provided', async () => {
      const controller = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ prepared: false }));

      await RecoveryService.getRecoveryStatus(controller.signal);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(RecoveryService.getRecoveryStatus()).rejects.toThrow(
        'Failed to fetch recovery status',
      );
    });
  });

  describe('getExtendedWallet', () => {
    it('returns extended wallet data on success', async () => {
      const responseBody = [
        {
          address: SECOND_SAFE_ADDRESS,
          safes: {
            gnosis: {
              [GNOSIS_SAFE_ADDRESS]: {
                backup_owners: [MOCK_BACKUP_OWNER],
                balances: {
                  [AddressZero]: '1000000000000000000',
                },
              },
            },
          },
          safe_chains: ['gnosis'],
          ledger_type: 'ethereum',
          extended_json: true,
          consistent_safe_address: true,
          consistent_backup_owner: true,
          consistent_backup_owner_count: true,
        },
      ];
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await RecoveryService.getExtendedWallet();
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/wallet/extended`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('passes AbortSignal when provided', async () => {
      const controller = new AbortController();
      jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse([]));

      await RecoveryService.getExtendedWallet(controller.signal);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(RecoveryService.getExtendedWallet()).rejects.toThrow(
        'Failed to fetch extended wallet',
      );
    });
  });

  describe('getRecoveryFundingRequirements', () => {
    it('returns funding requirements on success', async () => {
      const responseBody = {
        balances: {
          gnosis: {
            [GNOSIS_SAFE_ADDRESS]: {
              [AddressZero]: '1000000000000000000',
            },
          },
        },
        total_requirements: {
          gnosis: {
            [GNOSIS_SAFE_ADDRESS]: {
              [AddressZero]: '500000000000000000',
            },
          },
        },
        refill_requirements: {
          gnosis: {
            [GNOSIS_SAFE_ADDRESS]: {
              [AddressZero]: '0',
            },
          },
        },
        is_refill_required: false,
        pending_backup_owner_swaps: { gnosis: [] },
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await RecoveryService.getRecoveryFundingRequirements();
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/wallet/recovery/funding_requirements`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        RecoveryService.getRecoveryFundingRequirements(),
      ).rejects.toThrow('Failed to fetch recovery funding requirements');
    });
  });

  describe('prepareRecovery', () => {
    it('sends new password and returns recovery process on success', async () => {
      const responseBody = {
        id: 'recovery_bundle_7f3a2b',
        wallets: [
          {
            current_wallet: {
              address: SECOND_SAFE_ADDRESS,
            },
            new_wallet: {
              address: POLYGON_SAFE_ADDRESS,
            },
            new_mnemonic: ['creek', 'salute', 'fury'],
          },
        ],
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await RecoveryService.prepareRecovery('newpass123');
      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/wallet/recovery/prepare`,
        {
          method: 'POST',
          headers: expectedHeaders,
          body: JSON.stringify({ new_password: 'newpass123' }),
          signal: undefined,
        },
      );
    });

    it('passes AbortSignal when provided', async () => {
      const controller = new AbortController();
      jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse({}));

      await RecoveryService.prepareRecovery('pass', controller.signal);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(RecoveryService.prepareRecovery('newpass')).rejects.toThrow(
        'Failed to prepare recovery',
      );
    });
  });

  describe('completeRecovery', () => {
    it('returns success on ok response', async () => {
      const responseBody = { success: true };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await RecoveryService.completeRecovery();
      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/wallet/recovery/complete`,
        {
          method: 'POST',
          headers: expectedHeaders,
          signal: undefined,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(RecoveryService.completeRecovery()).rejects.toThrow(
        'Failed to complete recovery',
      );
    });
  });
});
