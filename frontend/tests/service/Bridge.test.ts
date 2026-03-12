import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import { BACKEND_URL } from '../../constants/urls';
import { BridgeService } from '../../service/Bridge';
import {
  BridgeRefillRequirementsRequest,
  BridgeRefillRequirementsResponse,
  BridgeStatusResponse,
} from '../../types/Bridge';
import {
  DEFAULT_SAFE_ADDRESS,
  MOCK_TX_HASH_1,
  MOCK_TX_HASH_2,
  UNKNOWN_TOKEN_ADDRESS,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const MOCK_QUOTE_ID = 'rb-36c6cbe0-1841-4de3-b9f6-873305a833f5';

/** Native token sentinel used by bridge API (EEE...EEE pattern) */
const NATIVE_TOKEN_BRIDGE_ADDRESS =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const makeBridgeRefillRequirementsRequest =
  (): BridgeRefillRequirementsRequest => ({
    bridge_requests: [
      {
        from: {
          chain: 'ethereum',
          address: DEFAULT_SAFE_ADDRESS,
          token: NATIVE_TOKEN_BRIDGE_ADDRESS,
        },
        to: {
          chain: 'gnosis',
          address: DEFAULT_SAFE_ADDRESS,
          token: UNKNOWN_TOKEN_ADDRESS,
          amount: '1000000000000000000',
        },
      },
    ],
    force_update: false,
  });

const makeBridgeRefillRequirementsResponse =
  (): BridgeRefillRequirementsResponse => ({
    id: MOCK_QUOTE_ID,
    balances: {},
    bridge_total_requirements: {},
    bridge_refill_requirements: {},
    bridge_request_status: [{ message: null, status: 'QUOTE_DONE', eta: 120 }],
    expiration_timestamp: 1710000600,
    is_refill_required: true,
  });

const makeBridgeStatusResponse = (
  overrides: Partial<BridgeStatusResponse> = {},
): BridgeStatusResponse => ({
  id: MOCK_QUOTE_ID,
  status: 'EXECUTION_DONE',
  bridge_request_status: [
    {
      explorer_link: `https://gnosisscan.io/tx/${MOCK_TX_HASH_1}`,
      message: null,
      status: 'EXECUTION_DONE',
      tx_hash: MOCK_TX_HASH_1,
    },
  ],
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

describe('BridgeService', () => {
  const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

  describe('getBridgeRefillRequirements', () => {
    const params = makeBridgeRefillRequirementsRequest();

    it('sends a POST request to the correct URL with headers and body', async () => {
      const responseBody = makeBridgeRefillRequirementsResponse();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await BridgeService.getBridgeRefillRequirements(params);

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/bridge/bridge_refill_requirements`,
        {
          method: 'POST',
          headers: expectedHeaders,
          body: JSON.stringify(params),
          signal: undefined,
        },
      );
    });

    it('throws an error when response is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        BridgeService.getBridgeRefillRequirements(params),
      ).rejects.toThrow(
        `Failed to get bridge refill requirements for the following params: ${params}`,
      );
    });

    it('passes the AbortSignal through to fetch', async () => {
      const responseBody = makeBridgeRefillRequirementsResponse();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const controller = new AbortController();
      await BridgeService.getBridgeRefillRequirements(
        params,
        controller.signal,
      );

      const fetchCall = jest.mocked(global.fetch).mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      expect(requestInit.signal).toBe(controller.signal);
    });

    it('propagates force_update in the request body', async () => {
      const forceParams: BridgeRefillRequirementsRequest = {
        ...params,
        force_update: true,
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(
          mockJsonResponse(makeBridgeRefillRequirementsResponse()),
        );

      await BridgeService.getBridgeRefillRequirements(forceParams);

      const fetchCall = jest.mocked(global.fetch).mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      expect(requestInit.body).toBe(JSON.stringify(forceParams));
    });
  });

  describe('executeBridge', () => {
    it('sends a POST request to the correct URL with the quote id in the body', async () => {
      const responseBody = makeBridgeStatusResponse({
        status: 'EXECUTION_PENDING',
        bridge_request_status: [
          {
            explorer_link: undefined,
            message: null,
            status: 'EXECUTION_PENDING',
          },
        ],
      });
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await BridgeService.executeBridge(MOCK_QUOTE_ID);

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL}/bridge/execute`, {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify({ id: MOCK_QUOTE_ID }),
        signal: undefined,
      });
    });

    it('throws an error when response is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(BridgeService.executeBridge(MOCK_QUOTE_ID)).rejects.toThrow(
        `Failed to execute bridge quote for the following quote id: ${MOCK_QUOTE_ID}`,
      );
    });

    it('passes the AbortSignal through to fetch', async () => {
      const responseBody = makeBridgeStatusResponse();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const controller = new AbortController();
      await BridgeService.executeBridge(MOCK_QUOTE_ID, controller.signal);

      const fetchCall = jest.mocked(global.fetch).mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      expect(requestInit.signal).toBe(controller.signal);
    });

    it('serializes the id as JSON object in the body', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(makeBridgeStatusResponse()));

      await BridgeService.executeBridge(MOCK_QUOTE_ID);

      const fetchCall = jest.mocked(global.fetch).mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      expect(requestInit.body).toBe(JSON.stringify({ id: MOCK_QUOTE_ID }));
    });
  });

  describe('getBridgeStatus', () => {
    it('sends a GET request to the correct URL with the quote id in the path', async () => {
      const responseBody = makeBridgeStatusResponse();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await BridgeService.getBridgeStatus(MOCK_QUOTE_ID);

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/bridge/status/${MOCK_QUOTE_ID}`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: undefined,
        },
      );
    });

    it('throws an error when response is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 404));

      await expect(
        BridgeService.getBridgeStatus(MOCK_QUOTE_ID),
      ).rejects.toThrow(
        `Failed to get bridge status for the following quote id: ${MOCK_QUOTE_ID}`,
      );
    });

    it('passes the AbortSignal through to fetch', async () => {
      const responseBody = makeBridgeStatusResponse();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const controller = new AbortController();
      await BridgeService.getBridgeStatus(MOCK_QUOTE_ID, controller.signal);

      const fetchCall = jest.mocked(global.fetch).mock.calls[0];
      const requestInit = fetchCall[1] as RequestInit;
      expect(requestInit.signal).toBe(controller.signal);
    });

    it('returns EXECUTION_DONE status with explorer link and tx_hash', async () => {
      const responseBody = makeBridgeStatusResponse({
        status: 'EXECUTION_DONE',
        bridge_request_status: [
          {
            explorer_link: `https://gnosisscan.io/tx/${MOCK_TX_HASH_2}`,
            message: null,
            status: 'EXECUTION_DONE',
            tx_hash: MOCK_TX_HASH_2,
          },
        ],
      });
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await BridgeService.getBridgeStatus(MOCK_QUOTE_ID);

      expect(result.status).toBe('EXECUTION_DONE');
      expect(result.bridge_request_status[0].explorer_link).toBe(
        `https://gnosisscan.io/tx/${MOCK_TX_HASH_2}`,
      );
      expect(result.bridge_request_status[0].tx_hash).toBe(MOCK_TX_HASH_2);
    });

    it('returns EXECUTION_PENDING status when bridge is in progress', async () => {
      const responseBody = makeBridgeStatusResponse({
        status: 'EXECUTION_PENDING',
        bridge_request_status: [
          {
            explorer_link: undefined,
            message: 'Bridge transaction submitted',
            status: 'EXECUTION_PENDING',
          },
        ],
      });
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await BridgeService.getBridgeStatus(MOCK_QUOTE_ID);

      expect(result.status).toBe('EXECUTION_PENDING');
      expect(result.bridge_request_status[0].message).toBe(
        'Bridge transaction submitted',
      );
    });
  });
});
