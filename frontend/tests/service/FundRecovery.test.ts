import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL } from '../../constants/urls';
import { FundRecoveryService } from '../../service/FundRecovery';
import {
  FundRecoveryExecuteRequest,
  FundRecoveryExecuteResponse,
  FundRecoveryScanRequest,
  FundRecoveryScanResponse,
} from '../../types/FundRecovery';

const SCAN_URL = `${BACKEND_URL}/fund_recovery/scan`;
const EXECUTE_URL = `${BACKEND_URL}/fund_recovery/execute`;

const mockJsonResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

const SAMPLE_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const SAMPLE_DESTINATION = '0x1234567890AbcdEF1234567890aBcdef12345678';

const SAMPLE_SCAN_REQUEST: FundRecoveryScanRequest = {
  mnemonic: SAMPLE_MNEMONIC,
};

const SAMPLE_EXECUTE_REQUEST: FundRecoveryExecuteRequest = {
  mnemonic: SAMPLE_MNEMONIC,
  destination_address: SAMPLE_DESTINATION,
};

const SAMPLE_SCAN_RESPONSE: FundRecoveryScanResponse = {
  master_eoa_address: SAMPLE_DESTINATION,
  balances: {
    '100': {
      [SAMPLE_DESTINATION as `0x${string}`]: {
        ['0x0000000000000000000000000000000000000000' as `0x${string}`]:
          '1000000000000000000',
      },
    },
  },
  services: [],
  gas_warning: {},
};

const SAMPLE_EXECUTE_SUCCESS: FundRecoveryExecuteResponse = {
  success: true,
  partial_failure: false,
  total_funds_moved: {
    '100': {
      [SAMPLE_DESTINATION as `0x${string}`]: {
        ['0x0000000000000000000000000000000000000000' as `0x${string}`]:
          '1000000000000000000',
      },
    },
  },
  errors: [],
};

beforeEach(() => {
  global.fetch = jest.fn();
  jest.restoreAllMocks();
});

describe('FundRecoveryService', () => {
  const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

  describe('scan', () => {
    it('resolves with scan response on success', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(SAMPLE_SCAN_RESPONSE));

      const result = await FundRecoveryService.scan(SAMPLE_SCAN_REQUEST);

      expect(result).toEqual(SAMPLE_SCAN_RESPONSE);
    });

    it('sends a POST to the correct scan URL', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(SAMPLE_SCAN_RESPONSE));

      await FundRecoveryService.scan(SAMPLE_SCAN_REQUEST);

      expect(fetch).toHaveBeenCalledWith(
        SCAN_URL,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sends the correct headers and body for scan', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(SAMPLE_SCAN_RESPONSE));

      await FundRecoveryService.scan(SAMPLE_SCAN_REQUEST);

      expect(fetch).toHaveBeenCalledWith(SCAN_URL, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify(SAMPLE_SCAN_REQUEST),
      });
    });

    it('throws with backend error message when scan returns non-ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(
          mockJsonResponse({ error: 'Invalid mnemonic' }, false),
        );

      await expect(
        FundRecoveryService.scan(SAMPLE_SCAN_REQUEST),
      ).rejects.toThrow('Invalid mnemonic');
    });

    it('throws a default message when scan returns non-ok without error field', async () => {
      jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse({}, false));

      await expect(
        FundRecoveryService.scan(SAMPLE_SCAN_REQUEST),
      ).rejects.toThrow('Failed to scan for recoverable funds');
    });

    it('propagates network errors from scan', async () => {
      const networkError = new Error('Network error');
      jest.spyOn(global, 'fetch').mockRejectedValue(networkError);

      await expect(
        FundRecoveryService.scan(SAMPLE_SCAN_REQUEST),
      ).rejects.toThrow('Network error');
    });
  });

  describe('execute', () => {
    it('resolves with execute response on success', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(SAMPLE_EXECUTE_SUCCESS));

      const result = await FundRecoveryService.execute(SAMPLE_EXECUTE_REQUEST);

      expect(result).toEqual(SAMPLE_EXECUTE_SUCCESS);
    });

    it('sends a POST to the correct execute URL', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(SAMPLE_EXECUTE_SUCCESS));

      await FundRecoveryService.execute(SAMPLE_EXECUTE_REQUEST);

      expect(fetch).toHaveBeenCalledWith(
        EXECUTE_URL,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sends the correct headers and body for execute', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(SAMPLE_EXECUTE_SUCCESS));

      await FundRecoveryService.execute(SAMPLE_EXECUTE_REQUEST);

      expect(fetch).toHaveBeenCalledWith(EXECUTE_URL, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify(SAMPLE_EXECUTE_REQUEST),
      });
    });

    it('throws with backend error message when execute returns non-ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(
          mockJsonResponse({ error: 'Execution failed' }, false),
        );

      await expect(
        FundRecoveryService.execute(SAMPLE_EXECUTE_REQUEST),
      ).rejects.toThrow('Execution failed');
    });

    it('throws a default message when execute returns non-ok without error field', async () => {
      jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse({}, false));

      await expect(
        FundRecoveryService.execute(SAMPLE_EXECUTE_REQUEST),
      ).rejects.toThrow('Failed to execute fund recovery');
    });

    it('propagates network errors from execute', async () => {
      const networkError = new Error('Network error');
      jest.spyOn(global, 'fetch').mockRejectedValue(networkError);

      await expect(
        FundRecoveryService.execute(SAMPLE_EXECUTE_REQUEST),
      ).rejects.toThrow('Network error');
    });
  });
});
