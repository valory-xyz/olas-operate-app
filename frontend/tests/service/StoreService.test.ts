import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL } from '../../constants/urls';
import { StoreService } from '../../service/StoreService';

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

describe('StoreService', () => {
  const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

  describe('getStore', () => {
    it('returns store data on success', async () => {
      const storeData = { trader: { isInitialFunded: { 'svc-1': true } } };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ data: storeData }));

      const result = await StoreService.getStore();

      expect(result).toEqual(storeData);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/store`, {
        method: 'GET',
        headers: expectedHeaders,
      });
    });

    it('returns empty object when backend has no store file', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ data: {} }));

      const result = await StoreService.getStore();
      expect(result).toEqual({});
    });

    it('returns empty object when data field is null', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ data: null }));

      const result = await StoreService.getStore();
      expect(result).toEqual({});
    });

    it('returns empty object when data field is missing', async () => {
      jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse({}));

      const result = await StoreService.getStore();
      expect(result).toEqual({});
    });

    it('returns empty object on HTTP 404 (store not created yet)', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 404));

      const result = await StoreService.getStore();
      expect(result).toEqual({});
    });

    it('returns empty object on HTTP 204 (empty response)', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 204));

      const result = await StoreService.getStore();
      expect(result).toEqual({});
    });

    it('throws on HTTP 500 (corrupted store)', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(StoreService.getStore()).rejects.toThrow(
        'Failed to fetch pearl store (HTTP 500)',
      );
    });

    it('throws on other error responses', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 503));

      await expect(StoreService.getStore()).rejects.toThrow(
        'Failed to fetch pearl store (HTTP 503)',
      );
    });

    it('throws when response body is not valid JSON', async () => {
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
        } as Response),
      );

      await expect(StoreService.getStore()).rejects.toThrow(
        'Pearl store response is not valid JSON',
      );
    });

    it('throws when data is not an object', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ data: 'corrupted' }));

      await expect(StoreService.getStore()).rejects.toThrow(
        'Pearl store data is not a valid object',
      );
    });

    it('throws when data is an array', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ data: [1, 2, 3] }));

      await expect(StoreService.getStore()).rejects.toThrow(
        'Pearl store data is not a valid object',
      );
    });
  });

  describe('setStoreKey', () => {
    it('sends POST with key and value', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ success: true }));

      await StoreService.setStoreKey('trader.isInitialFunded', {
        'svc-1': true,
      });

      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/store`, {
        method: 'POST',
        body: JSON.stringify({
          key: 'trader.isInitialFunded',
          value: { 'svc-1': true },
        }),
        headers: expectedHeaders,
      });
    });

    it('resolves on success', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ success: true }));

      await expect(
        StoreService.setStoreKey('autoRun', { enabled: true }),
      ).resolves.toBeUndefined();
    });

    it('throws on non-ok response with status code', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 400));

      await expect(
        StoreService.setStoreKey('bad..key', 'value'),
      ).rejects.toThrow("Failed to set store key 'bad..key' (HTTP 400)");
    });

    it('throws on server error', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(StoreService.setStoreKey('trader', {})).rejects.toThrow(
        "Failed to set store key 'trader' (HTTP 500)",
      );
    });
  });

  describe('deleteStoreKey', () => {
    it('sends DELETE with URL-encoded key', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ success: true }));

      await StoreService.deleteStoreKey('trader.isInitialFunded');

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/store/${encodeURIComponent('trader.isInitialFunded')}`,
        {
          method: 'DELETE',
          headers: expectedHeaders,
        },
      );
    });

    it('resolves on success', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ success: true }));

      await expect(
        StoreService.deleteStoreKey('autoRun'),
      ).resolves.toBeUndefined();
    });

    it('throws on non-ok response with status code', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 404));

      await expect(StoreService.deleteStoreKey('nonexistent')).rejects.toThrow(
        "Failed to delete store key 'nonexistent' (HTTP 404)",
      );
    });
  });
});
