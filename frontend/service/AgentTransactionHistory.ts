import { gql, request } from 'graphql-request';

import { EvmChainId } from '@/constants/chains';
import {
  getTransactionHistorySchemaRevision,
  TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN,
} from '@/constants/urls';
import { Address } from '@/types/Address';
import {
  AgentTransactionHistoryResponse,
  AgentTransactionHistoryResponseSchema,
  AgentTransactionHistoryResponseV2Schema,
} from '@/types/TransactionHistory';
// Deep import (not the '@/utils' barrel): config/chains pulls the barrel at
// module init, so barrel-importing here forms a cycle that breaks test loads.
import { normalizeAgentTransactionHistoryResponseV2 } from '@/utils/transactionHistory';

const FETCH_AGENT_TRANSACTION_HISTORY_QUERY = gql`
  query GetAgentTransactionHistory(
    $agentSafe: Bytes!
    $first: Int!
    $skip: Int!
  ) {
    fundsMovements(
      where: {
        agentSafe: $agentSafe
        category_in: [MASTER_TO_AGENT, AGENT_TO_MASTER]
      }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      category
      source
      bondType
      token
      amount
      from
      to
      blockTimestamp
      transactionHash
      agentSafe {
        id
        service {
          id
          agentIds
        }
      }
      service {
        id
        agentIds
      }
    }
    _meta {
      block {
        number
        timestamp
      }
      hasIndexingErrors
    }
  }
`;

// v2 (subgraph v0.0.7) variant: no `bondType` on FundsMovement, service refs
// carry the numeric id in `serviceId`. The category filter is unchanged — on
// v2 OLAS reward sweeps are categorized AGENT_OLAS_TO_MASTER, so the same
// filter now excludes them server-side (v1 hides them client-side).
const FETCH_AGENT_TRANSACTION_HISTORY_QUERY_V2 = gql`
  query GetAgentTransactionHistoryV2(
    $agentSafe: Bytes!
    $first: Int!
    $skip: Int!
  ) {
    fundsMovements(
      where: {
        agentSafe: $agentSafe
        category_in: [MASTER_TO_AGENT, AGENT_TO_MASTER]
      }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      category
      source
      token
      amount
      from
      to
      blockTimestamp
      transactionHash
      agentSafe {
        id
        service {
          id
          serviceId
          agentIds
        }
      }
      service {
        id
        serviceId
        agentIds
      }
    }
    _meta {
      block {
        number
        timestamp
      }
      hasIndexingErrors
    }
  }
`;

type GetAgentTransactionHistoryParams = {
  chainId: EvmChainId;
  agentSafe: Address;
  first?: number;
  skip?: number;
};

const DEFAULT_PAGE_SIZE = 100;

const get = async ({
  chainId,
  agentSafe,
  first = DEFAULT_PAGE_SIZE,
  skip = 0,
}: GetAgentTransactionHistoryParams): Promise<AgentTransactionHistoryResponse> => {
  const url = TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId];
  if (!url) {
    throw new Error(
      `No transaction-history subgraph configured for chain ${chainId}`,
    );
  }

  const variables = { agentSafe: agentSafe.toLowerCase(), first, skip };

  if (getTransactionHistorySchemaRevision(chainId) === 'v2') {
    const raw = await request(
      url,
      FETCH_AGENT_TRANSACTION_HISTORY_QUERY_V2,
      variables,
    );
    return normalizeAgentTransactionHistoryResponseV2(
      AgentTransactionHistoryResponseV2Schema.parse(raw),
    );
  }

  const raw = await request(
    url,
    FETCH_AGENT_TRANSACTION_HISTORY_QUERY,
    variables,
  );
  return AgentTransactionHistoryResponseSchema.parse(raw);
};

// The Graph caps `first` at 1000. We fetch a single 1000-row page for now —
// plenty for the 10-at-a-time view and bounds gateway cost. Older history
// beyond 1000 raw movements is dropped (an error fires); the real fix
// (server-side filtering + pagination) is a subgraph follow-up. getAll keeps
// the page loop so the cap is a one-line bump (MAX_PAGES) once that lands.
const PAGE_SIZE = 1000;
const MAX_PAGES = 1;

const getAll = async ({
  chainId,
  agentSafe,
}: Pick<
  GetAgentTransactionHistoryParams,
  'chainId' | 'agentSafe'
>): Promise<AgentTransactionHistoryResponse> => {
  if (!TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId]) {
    throw new Error(
      `No transaction-history subgraph configured for chain ${chainId}`,
    );
  }

  let base: AgentTransactionHistoryResponse | null = null;
  const fundsMovements: AgentTransactionHistoryResponse['fundsMovements'] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await get({
      chainId,
      agentSafe,
      first: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    });

    if (!base) base = res; // _meta comes from the first page.
    fundsMovements.push(...res.fundsMovements);

    if (res.fundsMovements.length < PAGE_SIZE) break;

    if (page === MAX_PAGES - 1) {
      console.error(
        `[AgentTransactionHistory] hit the ${MAX_PAGES * PAGE_SIZE}-row cap for ${agentSafe}; older history may be truncated.`,
      );
    }
  }

  return {
    ...(base as AgentTransactionHistoryResponse),
    fundsMovements,
  };
};

export const AgentTransactionHistoryService = { get, getAll };
