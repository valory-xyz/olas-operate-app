import { EvmChainIdMap } from '../../constants/chains';
import {
  TRANSACTION_HISTORY_SUBGRAPH_SCHEMA_BY_EVM_CHAIN,
  TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN,
} from '../../constants/urls';
import { AgentTransactionHistoryService } from '../../service/AgentTransactionHistory';
import {
  makeAgentTransactionHistoryResponseSqd,
  makeAgentTransactionHistoryResponseV2,
  makeFundsMovementV2,
  makeServiceRefV2,
  makeSubgraphMeta,
  MOCK_MULTISIG_ADDRESS,
  MOCK_OLAS_TOKEN_ADDRESS,
  MOCK_USDC_E_TOKEN_ADDRESS,
} from '../helpers/factories';

const mockGraphqlRequest = jest.fn();
jest.mock('graphql-request', () => ({
  request: (...args: unknown[]) => mockGraphqlRequest(...args),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

describe('AgentTransactionHistoryService.get (v2 schema)', () => {
  const URL = 'https://pearl-transactions.subgraph.example';

  beforeEach(() => {
    TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Base] = URL;
    TRANSACTION_HISTORY_SUBGRAPH_SCHEMA_BY_EVM_CHAIN[EvmChainIdMap.Base] = 'v2';
  });
  afterEach(() => {
    jest.clearAllMocks();
    delete TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Base];
    delete TRANSACTION_HISTORY_SUBGRAPH_SCHEMA_BY_EVM_CHAIN[EvmChainIdMap.Base];
  });

  it('sends the v2 query (no bondType selection) with lowercased agentSafe', async () => {
    mockGraphqlRequest.mockResolvedValueOnce(
      makeAgentTransactionHistoryResponseV2(),
    );

    await AgentTransactionHistoryService.get({
      chainId: EvmChainIdMap.Base,
      agentSafe: MOCK_MULTISIG_ADDRESS,
    });

    const [url, query, variables] = mockGraphqlRequest.mock.calls[0];
    expect(url).toBe(URL);
    expect(query).toContain('GetAgentTransactionHistoryV2');
    expect(query).not.toContain('bondType');
    expect(variables).toEqual({
      agentSafe: MOCK_MULTISIG_ADDRESS.toLowerCase(),
      first: 100,
      skip: 0,
    });
  });

  it('normalizes the v2 response to the domain shape', async () => {
    mockGraphqlRequest.mockResolvedValueOnce(
      makeAgentTransactionHistoryResponseV2({
        fundsMovements: [
          makeFundsMovementV2({
            id: 'withdrawal',
            category: 'AGENT_TO_MASTER',
            token: MOCK_USDC_E_TOKEN_ADDRESS,
            service: makeServiceRefV2({ id: '0x7802', serviceId: '632' }),
          }),
          makeFundsMovementV2({
            id: 'sweep',
            category: 'AGENT_OLAS_TO_MASTER',
            token: MOCK_OLAS_TOKEN_ADDRESS,
          }),
        ],
      }),
    );

    const result = await AgentTransactionHistoryService.get({
      chainId: EvmChainIdMap.Base,
      agentSafe: MOCK_MULTISIG_ADDRESS,
    });

    expect(result.fundsMovements.map((m) => m.id)).toEqual(['withdrawal']);
    expect(result.fundsMovements[0].service?.id).toBe('632');
  });

  it('throws when a v1-shaped chain sends malformed v2 data', async () => {
    mockGraphqlRequest.mockResolvedValueOnce({
      fundsMovements: [{ id: 'broken' }],
      _meta: null,
    });

    await expect(
      AgentTransactionHistoryService.get({
        chainId: EvmChainIdMap.Base,
        agentSafe: MOCK_MULTISIG_ADDRESS,
      }),
    ).rejects.toThrow();
  });
});

const ORIGINAL_POLYGON_URL =
  TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Polygon];
const ORIGINAL_POLYGON_SCHEMA =
  TRANSACTION_HISTORY_SUBGRAPH_SCHEMA_BY_EVM_CHAIN[EvmChainIdMap.Polygon];

describe('AgentTransactionHistoryService.get (sqd schema)', () => {
  const URL = 'https://subgraph.example/squid/transactions-polygon/graphql';

  beforeEach(() => {
    TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Polygon] = URL;
    TRANSACTION_HISTORY_SUBGRAPH_SCHEMA_BY_EVM_CHAIN[EvmChainIdMap.Polygon] =
      'sqd';
  });
  // Polygon is a real shipped entry (unlike the Base stand-in the v2 suite
  // borrows), so restore it rather than delete it.
  afterEach(() => {
    jest.clearAllMocks();
    TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Polygon] =
      ORIGINAL_POLYGON_URL;
    TRANSACTION_HISTORY_SUBGRAPH_SCHEMA_BY_EVM_CHAIN[EvmChainIdMap.Polygon] =
      ORIGINAL_POLYGON_SCHEMA;
  });

  it('sends the OpenReader query with limit/offset and lowercased agentSafe', async () => {
    mockGraphqlRequest.mockResolvedValueOnce(
      makeAgentTransactionHistoryResponseSqd(),
    );

    await AgentTransactionHistoryService.get({
      chainId: EvmChainIdMap.Polygon,
      agentSafe: MOCK_MULTISIG_ADDRESS,
      first: 25,
      skip: 50,
    });

    const [url, query, variables] = mockGraphqlRequest.mock.calls[0];
    expect(url).toBe(URL);
    expect(query).toContain('GetAgentTransactionHistorySqd');
    expect(query).toContain('agentSafe: { id_eq: $agentSafe }');
    expect(query).toContain('orderBy: blockTimestamp_DESC');
    expect(query).toContain('indexerStatus: indexerStatusById(id: "1")');
    expect(query).not.toContain('orderDirection');
    expect(query).not.toContain('_meta');
    expect(query).not.toContain('bondType');
    expect(query).not.toContain('first:');
    expect(query).not.toContain('skip:');
    expect(variables).toEqual({
      agentSafe: MOCK_MULTISIG_ADDRESS.toLowerCase(),
      limit: 25,
      offset: 50,
    });
  });

  // getAll is the entry point the Agent Wallet hook actually calls; pin that
  // it drives the sqd branch at PAGE_SIZE and that the mapped meta survives
  // the page-merge spread.
  it('getAll pages with limit/offset and keeps the mapped meta', async () => {
    mockGraphqlRequest.mockResolvedValueOnce(
      makeAgentTransactionHistoryResponseSqd({
        fundsMovements: [
          makeFundsMovementV2({ id: 'only', category: 'MASTER_TO_AGENT' }),
        ],
      }),
    );

    const result = await AgentTransactionHistoryService.getAll({
      chainId: EvmChainIdMap.Polygon,
      agentSafe: MOCK_MULTISIG_ADDRESS,
    });

    expect(mockGraphqlRequest).toHaveBeenCalledTimes(1);
    const [, query, variables] = mockGraphqlRequest.mock.calls[0];
    expect(query).toContain('GetAgentTransactionHistorySqd');
    expect(variables).toEqual({
      agentSafe: MOCK_MULTISIG_ADDRESS.toLowerCase(),
      limit: 1000,
      offset: 0,
    });
    expect(result.fundsMovements.map((m) => m.id)).toEqual(['only']);
    expect(result._meta).toEqual(makeSubgraphMeta());
  });

  it('normalizes the sqd response to the domain shape, mapping meta', async () => {
    mockGraphqlRequest.mockResolvedValueOnce(
      makeAgentTransactionHistoryResponseSqd({
        fundsMovements: [
          makeFundsMovementV2({
            id: 'funding',
            category: 'MASTER_TO_AGENT',
            token: MOCK_USDC_E_TOKEN_ADDRESS,
            service: makeServiceRefV2({ id: '272', serviceId: '272' }),
          }),
          makeFundsMovementV2({
            id: 'sweep',
            category: 'AGENT_OLAS_TO_MASTER',
            token: MOCK_OLAS_TOKEN_ADDRESS,
          }),
        ],
      }),
    );

    const result = await AgentTransactionHistoryService.get({
      chainId: EvmChainIdMap.Polygon,
      agentSafe: MOCK_MULTISIG_ADDRESS,
    });

    expect(result.fundsMovements.map((m) => m.id)).toEqual(['funding']);
    expect(result.fundsMovements[0].service?.id).toBe('272');
    expect(result._meta).toEqual(makeSubgraphMeta());
  });

  it('throws when a Graph-shaped response (with _meta) arrives on an sqd chain', async () => {
    mockGraphqlRequest.mockResolvedValueOnce(
      makeAgentTransactionHistoryResponseV2(),
    );

    await expect(
      AgentTransactionHistoryService.get({
        chainId: EvmChainIdMap.Polygon,
        agentSafe: MOCK_MULTISIG_ADDRESS,
      }),
    ).rejects.toThrow();
  });
});
