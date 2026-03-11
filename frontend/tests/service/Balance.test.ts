import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL_V2 } from '../../constants/urls';
import { BalanceService } from '../../service/Balance';
import { BalancesAndFundingRequirements } from '../../types/Funding';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  MOCK_SERVICE_CONFIG_ID_3,
  MOCK_SERVICE_CONFIG_ID_4,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const makeBalancesAndFundingRequirements = (
  overrides: Partial<BalancesAndFundingRequirements> = {},
): BalancesAndFundingRequirements => ({
  balances: {},
  refill_requirements: {},
  total_requirements:
    {} as BalancesAndFundingRequirements['total_requirements'],
  agent_funding_requests: {},
  protocol_asset_requirements: {},
  bonded_assets: {},
  is_refill_required: false,
  agent_funding_in_progress: false,
  agent_funding_requests_cooldown: false,
  allow_start_agent: true,
  ...overrides,
});

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

describe('BalanceService', () => {
  const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

  describe('getBalancesAndFundingRequirements', () => {
    it('returns balances and funding requirements on success', async () => {
      const responseBody = makeBalancesAndFundingRequirements({
        is_refill_required: true,
        allow_start_agent: false,
      });
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const controller = new AbortController();
      const result = await BalanceService.getBalancesAndFundingRequirements({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        signal: controller.signal,
      });

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/funding_requirements`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: controller.signal,
        },
      );
    });

    it('throws an error when response is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      const controller = new AbortController();
      await expect(
        BalanceService.getBalancesAndFundingRequirements({
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
          signal: controller.signal,
        }),
      ).rejects.toThrow(
        `Failed to fetch balances and funding requirements for ${DEFAULT_SERVICE_CONFIG_ID}`,
      );
    });

    it('passes the AbortSignal through to fetch', async () => {
      const responseBody = makeBalancesAndFundingRequirements();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const controller = new AbortController();
      await BalanceService.getBalancesAndFundingRequirements({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        signal: controller.signal,
      });

      const fetchCall = jest.mocked(global.fetch).mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      expect(requestInit.signal).toBe(controller.signal);
    });
  });

  describe('getAllBalancesAndFundingRequirements', () => {
    it('returns results for all service config IDs when all succeed', async () => {
      const responseA = makeBalancesAndFundingRequirements({
        is_refill_required: true,
      });
      const responseB = makeBalancesAndFundingRequirements({
        allow_start_agent: false,
      });

      jest
        .spyOn(global, 'fetch')
        .mockReturnValueOnce(mockJsonResponse(responseA))
        .mockReturnValueOnce(mockJsonResponse(responseB));

      const controller = new AbortController();
      const result = await BalanceService.getAllBalancesAndFundingRequirements({
        serviceConfigIds: [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_3],
        signal: controller.signal,
      });

      expect(result).toEqual({
        [DEFAULT_SERVICE_CONFIG_ID]: responseA,
        [MOCK_SERVICE_CONFIG_ID_3]: responseB,
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('returns only successful results when some requests fail', async () => {
      const responseA = makeBalancesAndFundingRequirements({
        is_refill_required: false,
      });

      jest
        .spyOn(global, 'fetch')
        .mockReturnValueOnce(mockJsonResponse(responseA))
        .mockReturnValueOnce(mockJsonResponse({}, false, 500))
        .mockReturnValueOnce(mockJsonResponse({}, false, 404));

      const controller = new AbortController();
      const result = await BalanceService.getAllBalancesAndFundingRequirements({
        serviceConfigIds: [
          DEFAULT_SERVICE_CONFIG_ID,
          MOCK_SERVICE_CONFIG_ID_3,
          MOCK_SERVICE_CONFIG_ID_4,
        ],
        signal: controller.signal,
      });

      expect(result).toEqual({
        [DEFAULT_SERVICE_CONFIG_ID]: responseA,
      });
      expect(result).not.toHaveProperty(MOCK_SERVICE_CONFIG_ID_3);
      expect(result).not.toHaveProperty(MOCK_SERVICE_CONFIG_ID_4);
    });

    it('returns an empty object when given an empty array of service config IDs', async () => {
      const controller = new AbortController();
      const result = await BalanceService.getAllBalancesAndFundingRequirements({
        serviceConfigIds: [],
        signal: controller.signal,
      });

      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('passes the AbortSignal to each individual fetch call', async () => {
      const responseA = makeBalancesAndFundingRequirements();
      const responseB = makeBalancesAndFundingRequirements();

      jest
        .spyOn(global, 'fetch')
        .mockReturnValueOnce(mockJsonResponse(responseA))
        .mockReturnValueOnce(mockJsonResponse(responseB));

      const controller = new AbortController();
      await BalanceService.getAllBalancesAndFundingRequirements({
        serviceConfigIds: [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_3],
        signal: controller.signal,
      });

      const fetchMock = jest.mocked(global.fetch);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      for (const call of fetchMock.mock.calls) {
        const requestInit = call[1] as RequestInit;
        expect(requestInit.signal).toBe(controller.signal);
      }
    });

    it('returns an empty object when all requests fail', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValueOnce(mockJsonResponse({}, false, 500))
        .mockReturnValueOnce(mockJsonResponse({}, false, 503));

      const controller = new AbortController();
      const result = await BalanceService.getAllBalancesAndFundingRequirements({
        serviceConfigIds: [DEFAULT_SERVICE_CONFIG_ID, MOCK_SERVICE_CONFIG_ID_3],
        signal: controller.signal,
      });

      expect(result).toEqual({});
    });
  });
});
