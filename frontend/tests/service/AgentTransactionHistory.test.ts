import { EvmChainIdMap } from '../../constants/chains';
import {
  TRANSACTION_HISTORY_SUBGRAPH_SCHEMA_BY_EVM_CHAIN,
  TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN,
} from '../../constants/urls';
import { AgentTransactionHistoryService } from '../../service/AgentTransactionHistory';
import {
  makeAgentTransactionHistoryResponseV2,
  makeFundsMovementV2,
  makeServiceRefV2,
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
