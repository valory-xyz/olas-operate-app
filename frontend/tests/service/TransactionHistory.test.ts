import { EvmChainIdMap } from '../../constants/chains';
import { TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '../../constants/urls';
import { TransactionHistoryService } from '../../service/TransactionHistory';
import { Address } from '../../types/Address';
import {
  DEFAULT_SAFE_ADDRESS,
  makeFundsMovement,
  makeTransactionHistoryResponse,
} from '../helpers/factories';

const mockGraphqlRequest = jest.fn();
jest.mock('graphql-request', () => ({
  request: (...args: unknown[]) => mockGraphqlRequest(...args),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

describe('TransactionHistoryService.get', () => {
  // Each test controls the URL map explicitly — clear it before and after so a
  // populated default (or a leftover from another test) can't leak in.
  const clearUrls = () => {
    for (const key of Object.keys(
      TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN,
    )) {
      delete TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[
        Number(
          key,
        ) as keyof typeof TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN
      ];
    }
  };

  beforeEach(clearUrls);
  afterEach(() => {
    jest.clearAllMocks();
    clearUrls();
  });

  describe('when subgraph URL is not configured', () => {
    it('throws and never calls graphql-request', async () => {
      await expect(
        TransactionHistoryService.get({
          chainId: EvmChainIdMap.Gnosis,
          masterSafe: DEFAULT_SAFE_ADDRESS,
        }),
      ).rejects.toThrow('No transaction-history subgraph configured');

      expect(mockGraphqlRequest).not.toHaveBeenCalled();
    });
  });

  describe('when subgraph URL is configured', () => {
    const SUBGRAPH_URL = 'https://pearl-transactions.subgraph.example';

    beforeEach(() => {
      TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Gnosis] =
        SUBGRAPH_URL;
    });

    it('calls graphql-request with the URL and lowercased masterSafe', async () => {
      mockGraphqlRequest.mockResolvedValueOnce(
        makeTransactionHistoryResponse(),
      );

      await TransactionHistoryService.get({
        chainId: EvmChainIdMap.Gnosis,
        masterSafe: DEFAULT_SAFE_ADDRESS,
      });

      expect(mockGraphqlRequest).toHaveBeenCalledTimes(1);
      const [url, , variables] = mockGraphqlRequest.mock.calls[0];
      expect(url).toBe(SUBGRAPH_URL);
      expect(variables).toEqual({
        masterSafe: DEFAULT_SAFE_ADDRESS.toLowerCase(),
        first: 100,
        skip: 0,
      });
    });

    it('returns the parsed response on success', async () => {
      const response = makeTransactionHistoryResponse();
      mockGraphqlRequest.mockResolvedValueOnce(response);

      const result = await TransactionHistoryService.get({
        chainId: EvmChainIdMap.Gnosis,
        masterSafe: DEFAULT_SAFE_ADDRESS,
      });

      expect(result).toEqual(response);
    });

    it('honours first/skip overrides', async () => {
      mockGraphqlRequest.mockResolvedValueOnce(
        makeTransactionHistoryResponse(),
      );

      await TransactionHistoryService.get({
        chainId: EvmChainIdMap.Gnosis,
        masterSafe: DEFAULT_SAFE_ADDRESS,
        first: 25,
        skip: 50,
      });

      const [, , variables] = mockGraphqlRequest.mock.calls[0];
      expect(variables).toEqual({
        masterSafe: DEFAULT_SAFE_ADDRESS.toLowerCase(),
        first: 25,
        skip: 50,
      });
    });

    it('throws when the response fails Zod validation', async () => {
      mockGraphqlRequest.mockResolvedValueOnce({
        masterSafe: { id: DEFAULT_SAFE_ADDRESS, masterEoa: 'oops' },
        // missing the required collections, _meta, etc.
      });

      await expect(
        TransactionHistoryService.get({
          chainId: EvmChainIdMap.Gnosis,
          masterSafe: DEFAULT_SAFE_ADDRESS,
        }),
      ).rejects.toThrow();
    });

    it('propagates network errors from graphql-request', async () => {
      mockGraphqlRequest.mockRejectedValueOnce(new Error('boom'));

      await expect(
        TransactionHistoryService.get({
          chainId: EvmChainIdMap.Gnosis,
          masterSafe: DEFAULT_SAFE_ADDRESS,
        }),
      ).rejects.toThrow('boom');
    });
  });

  it('keeps the masterSafe lowercased even when called with a checksummed address', async () => {
    TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Gnosis] =
      'https://example';
    mockGraphqlRequest.mockResolvedValueOnce(makeTransactionHistoryResponse());

    const checksummed = '0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD' as Address;
    await TransactionHistoryService.get({
      chainId: EvmChainIdMap.Gnosis,
      masterSafe: checksummed,
    });

    const [, , variables] = mockGraphqlRequest.mock.calls[0];
    expect(variables.masterSafe).toBe(checksummed.toLowerCase());
  });
});

describe('TransactionHistoryService.getAll', () => {
  const URL = 'https://pearl-transactions.subgraph.example';
  const clearUrls = () => {
    for (const key of Object.keys(
      TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN,
    )) {
      delete TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[
        Number(
          key,
        ) as keyof typeof TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN
      ];
    }
  };

  beforeEach(() => {
    clearUrls();
    TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Gnosis] = URL;
  });
  afterEach(() => {
    jest.clearAllMocks();
    clearUrls();
  });

  it('makes a single request when the first page is short', async () => {
    mockGraphqlRequest.mockResolvedValueOnce(
      makeTransactionHistoryResponse({
        fundsMovements: [makeFundsMovement()],
        agentFundingEvents: [],
      }),
    );

    const res = await TransactionHistoryService.getAll({
      chainId: EvmChainIdMap.Gnosis,
      masterSafe: DEFAULT_SAFE_ADDRESS,
    });

    expect(mockGraphqlRequest).toHaveBeenCalledTimes(1);
    expect(res.fundsMovements).toHaveLength(1);
    expect(mockGraphqlRequest.mock.calls[0][2]).toEqual({
      masterSafe: DEFAULT_SAFE_ADDRESS.toLowerCase(),
      first: 1000,
      skip: 0,
    });
  });

  it('caps at a single 1000-row page (does not fetch beyond the cap)', async () => {
    // A full page (== PAGE_SIZE) signals more data exists, but the cap
    // (MAX_PAGES = 1) means we must NOT fetch a second page.
    const fullPage = Array.from({ length: 1000 }, (_, i) =>
      makeFundsMovement({ id: `0xpage0-${i}` }),
    );
    mockGraphqlRequest.mockResolvedValueOnce(
      makeTransactionHistoryResponse({
        fundsMovements: fullPage,
        agentFundingEvents: [],
      }),
    );

    const res = await TransactionHistoryService.getAll({
      chainId: EvmChainIdMap.Gnosis,
      masterSafe: DEFAULT_SAFE_ADDRESS,
    });

    expect(mockGraphqlRequest).toHaveBeenCalledTimes(1);
    expect(res.fundsMovements).toHaveLength(1000);
    expect(mockGraphqlRequest.mock.calls[0][2]).toEqual({
      masterSafe: DEFAULT_SAFE_ADDRESS.toLowerCase(),
      first: 1000,
      skip: 0,
    });
  });

  it('throws when no subgraph URL is configured', async () => {
    clearUrls();
    await expect(
      TransactionHistoryService.getAll({
        chainId: EvmChainIdMap.Gnosis,
        masterSafe: DEFAULT_SAFE_ADDRESS,
      }),
    ).rejects.toThrow('No transaction-history subgraph configured');

    expect(mockGraphqlRequest).not.toHaveBeenCalled();
  });
});
