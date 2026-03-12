import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL } from '../../constants/urls';
import { SettingsService } from '../../service/Settings';
import { DEFAULT_EOA_ADDRESS } from '../helpers/factories';

const mockJsonResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as Response);

beforeEach(() => {
  global.fetch = jest.fn();
  jest.restoreAllMocks();
});

const sampleSettings = {
  version: 1,
  eoa_topups: {
    gnosis: { [DEFAULT_EOA_ADDRESS]: '1000000000000000000' },
  },
  eoa_thresholds: {
    gnosis: { [DEFAULT_EOA_ADDRESS]: '500000000000000000' },
  },
};

describe('SettingsService', () => {
  describe('getSettings', () => {
    it('fetches settings from the correct URL', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(sampleSettings));

      await SettingsService.getSettings();

      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/settings`, {
        method: 'GET',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        signal: undefined,
      });
    });

    it('returns parsed JSON on success', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(sampleSettings));

      const result = await SettingsService.getSettings();
      expect(result).toEqual(sampleSettings);
    });

    it('throws "Failed to fetch settings" when response is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(null, false));

      await expect(SettingsService.getSettings()).rejects.toThrow(
        'Failed to fetch settings',
      );
    });

    it('passes AbortSignal to fetch', async () => {
      const controller = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(sampleSettings));

      await SettingsService.getSettings(controller.signal);

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/settings`,
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('rejects when fetch throws a network error', async () => {
      const networkError = new Error('Network error');
      jest.spyOn(global, 'fetch').mockRejectedValue(networkError);

      await expect(SettingsService.getSettings()).rejects.toBe(networkError);
    });
  });
});
