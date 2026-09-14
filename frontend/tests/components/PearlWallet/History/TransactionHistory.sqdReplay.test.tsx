import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { AgentTransactionHistory } from '../../../../components/AgentWallet/BalancesAndAssets/AgentTransactionHistory';
import { TransactionHistory } from '../../../../components/PearlWallet/History/TransactionHistory';
import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { EvmChainIdMap } from '../../../../constants/chains';
import {
  getTransactionHistorySchemaRevision,
  TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN,
} from '../../../../constants/urls';
import { createQueryClientWrapper } from '../../../helpers/queryClient';
import {
  POLYSTRAT_AGENT_SAFE,
  POLYSTRAT_MASTER_SAFE,
  SQD_AGENT_RESPONSE,
  SQD_MASTER_RESPONSE,
} from './sqdReplayFixture';

// End-to-end replay of the live Polygon squid through the UNMOCKED service →
// Zod → normalizer → hook → view. Only the network, the wallet/services
// providers, and the icon font are stubbed. Complements the unit suites,
// which each mock the layer below them.

const mockGraphqlRequest = jest.fn();
jest.mock('graphql-request', () => ({
  request: (...args: unknown[]) => mockGraphqlRequest(...args),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

const mockUsePearlWallet = jest.fn();
jest.mock('../../../../context/PearlWalletProvider', () => ({
  usePearlWallet: () => mockUsePearlWallet(),
}));

const mockUseServices = jest.fn();
jest.mock('../../../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

const mockUseService = jest.fn();
jest.mock('../../../../hooks/useService', () => ({
  useService: () => mockUseService(),
}));

jest.mock(
  '../../../../components/PearlWallet/History/TransactionRowIcon',
  () => ({
    TransactionRowIcon: () => <span data-testid="row-icon" />,
  }),
);

// The captured status is wall-clock relative; pin it to "now" so the
// stale-data banner reflects a live indexer, as it would in production.
const freshStatus = () => ({
  blockNumber: '93780236',
  blockTimestamp: `${Math.floor(Date.now() / 1000)}`,
});

describe('Polygon transaction history — live squid response replay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServices.mockReturnValue({
      services: undefined,
      getAgentTypeFromService: () => null,
      selectedAgentConfig: AGENT_CONFIG[AgentMap.Polystrat],
      selectedService: { service_config_id: 'sc-polystrat' },
    });
  });

  it('is wired to the squid with the sqd revision (real constants, not test overrides)', () => {
    expect(
      TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Polygon],
    ).toBe(
      'https://subgraph.autonolas.tech/squid/transactions-polygon/graphql',
    );
    expect(getTransactionHistorySchemaRevision(EvmChainIdMap.Polygon)).toBe(
      'sqd',
    );
  });

  it('Pearl Wallet Polygon tab renders the Polystrat funding + stake rows', async () => {
    mockUsePearlWallet.mockReturnValue({
      walletChainId: EvmChainIdMap.Polygon,
      masterSafeAddress: POLYSTRAT_MASTER_SAFE,
    });
    mockGraphqlRequest.mockResolvedValueOnce({
      ...SQD_MASTER_RESPONSE,
      indexerStatus: freshStatus(),
    });

    const { container } = render(<TransactionHistory />, {
      wrapper: createQueryClientWrapper(),
    });

    // The request went to the squid with OpenReader variables.
    await waitFor(() => expect(mockGraphqlRequest).toHaveBeenCalledTimes(1));
    const [url, query, variables] = mockGraphqlRequest.mock.calls[0];
    expect(url).toBe(
      TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[EvmChainIdMap.Polygon],
    );
    expect(query).toContain('GetTransactionHistorySqd');
    expect(variables).toEqual({
      masterSafe: POLYSTRAT_MASTER_SAFE,
      limit: 1000,
      offset: 0,
    });

    // Two "Fund Polystrat" rows (one per funding tx) and two bond deposits,
    // labelled from agentIds [86] → Polystrat without any local service.
    expect(await screen.findAllByText('Fund Polystrat')).toHaveLength(2);
    expect(screen.getAllByText('Polystrat stake')).toHaveLength(2);

    // Amounts resolve through POLYGON_TOKEN_CONFIG: pUSD (6 dp), native POL,
    // OLAS. From the Master Safe's side all four are outflows.
    const text = container.textContent ?? '';
    expect(text).toContain('-65.00');
    expect(text).toContain('pUSD');
    expect(text).toContain('-40.00');
    expect(text).toContain('POL');
    expect(text).toContain('-50.00');
    expect(text).toContain('OLAS');

    // Not stale, not unavailable, not empty.
    expect(screen.queryByText(/refresh/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/not available on this network/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('There are no transaction records yet.'),
    ).not.toBeInTheDocument();
  });

  it('Polystrat Agent Wallet renders the two "Fund agent" inflows and nothing else', async () => {
    mockUseService.mockReturnValue({
      getServiceSafeOf: () => ({ address: POLYSTRAT_AGENT_SAFE }),
    });
    mockGraphqlRequest.mockResolvedValueOnce({
      ...SQD_AGENT_RESPONSE,
      indexerStatus: freshStatus(),
    });

    const { container } = render(<AgentTransactionHistory />, {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(mockGraphqlRequest).toHaveBeenCalledTimes(1));
    const [, query, variables] = mockGraphqlRequest.mock.calls[0];
    expect(query).toContain('GetAgentTransactionHistorySqd');
    expect(variables).toEqual({
      agentSafe: POLYSTRAT_AGENT_SAFE,
      limit: 1000,
      offset: 0,
    });

    expect(await screen.findAllByText('Fund agent')).toHaveLength(2);
    expect(screen.queryByText('Withdrawal')).not.toBeInTheDocument();

    // Agent-side perspective: inflows, so positive.
    const text = container.textContent ?? '';
    expect(text).toContain('+65.00');
    expect(text).toContain('pUSD');
    expect(text).toContain('+40.00');
    expect(text).toContain('POL');
    expect(screen.queryByText(/refresh/i)).not.toBeInTheDocument();
  });
});
