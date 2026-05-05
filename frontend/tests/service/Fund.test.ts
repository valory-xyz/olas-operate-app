import { AddressZero } from '../../constants/address';
import { MiddlewareChainMap } from '../../constants/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL_V2 } from '../../constants/urls';
import { ChainFunds, FundService } from '../../service/Fund';
import {
  DEFAULT_EOA_ADDRESS,
  DEFAULT_SAFE_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  makeInsufficientGasError,
} from '../helpers/factories';

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

describe('FundService', () => {
  const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

  const sampleFunds: ChainFunds = {
    [MiddlewareChainMap.GNOSIS]: {
      [DEFAULT_SAFE_ADDRESS]: {
        [AddressZero]: '1000000000000000000',
      },
    },
  };

  describe('fundAgent', () => {
    it('resolves with JSON when the response is ok', async () => {
      const responseBody = { error: null };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await FundService.fundAgent({
        funds: sampleFunds,
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(result).toEqual(responseBody);
    });

    it('constructs the correct URL using serviceConfigId', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ error: null }));

      await FundService.fundAgent({
        funds: sampleFunds,
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/fund`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('sends the correct method, headers, and body', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ error: null }));

      await FundService.fundAgent({
        funds: sampleFunds,
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/fund`,
        {
          method: 'POST',
          body: JSON.stringify(sampleFunds),
          headers: expectedHeaders,
        },
      );
    });

    it('rejects with the parsed error body on non-ok response', async () => {
      const errorBody = makeInsufficientGasError();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(errorBody, false));

      await expect(
        FundService.fundAgent({
          funds: sampleFunds,
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        }),
      ).rejects.toEqual(errorBody);
    });

    it('rejects with an empty object when the error body is not JSON', async () => {
      jest.spyOn(global, 'fetch').mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('not json')),
        } as unknown as Response),
      );

      await expect(
        FundService.fundAgent({
          funds: sampleFunds,
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        }),
      ).rejects.toEqual({});
    });

    it('rejects when fetch throws a network error', async () => {
      const networkError = new Error('Network error');
      jest.spyOn(global, 'fetch').mockRejectedValue(networkError);

      await expect(
        FundService.fundAgent({
          funds: sampleFunds,
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        }),
      ).rejects.toBe(networkError);
    });

    it('handles multi-chain funds with multiple wallets', async () => {
      const multiChainFunds: ChainFunds = {
        [MiddlewareChainMap.GNOSIS]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '1000000000000000000',
            [DEFAULT_EOA_ADDRESS]: '500000000000000000',
          },
        },
        [MiddlewareChainMap.BASE]: {
          [DEFAULT_SAFE_ADDRESS]: {
            [AddressZero]: '2000000000000000000',
          },
        },
      };

      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ error: null }));

      await FundService.fundAgent({
        funds: multiChainFunds,
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/fund`,
        {
          method: 'POST',
          body: JSON.stringify(multiChainFunds),
          headers: expectedHeaders,
        },
      );
    });

    it('handles empty funds object', async () => {
      const emptyFunds: ChainFunds = {};

      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ error: null }));

      await FundService.fundAgent({
        funds: emptyFunds,
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/fund`,
        {
          method: 'POST',
          body: JSON.stringify(emptyFunds),
          headers: expectedHeaders,
        },
      );
    });

    it('resolves with error string when backend returns an error', async () => {
      const responseBody = { error: 'Insufficient funds' };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await FundService.fundAgent({
        funds: sampleFunds,
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(result).toEqual({ error: 'Insufficient funds' });
    });
  });
});
