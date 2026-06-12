import { gql, request } from 'graphql-request';

import { EvmChainId } from '@/constants/chains';
import { TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
import { Address } from '@/types/Address';
import {
  TransactionHistoryResponse,
  TransactionHistoryResponseSchema,
} from '@/types/TransactionHistory';

const FETCH_TRANSACTION_HISTORY_QUERY = gql`
  query GetTransactionHistory($masterSafe: Bytes!, $first: Int!, $skip: Int!) {
    masterSafe(id: $masterSafe) {
      id
      masterEoa
      owners
      threshold
      historyFloorBlock
      historyFloorTimestamp
    }
    fundsMovements(
      where: {
        masterSafe: $masterSafe
        category_in: [
          SERVICE_BOND_DEPOSIT
          SERVICE_BOND_REFUND
          MASTER_FUNDING_IN
          AGENT_TO_MASTER
          MASTER_TO_AGENT
          MASTER_WITHDRAWAL
        ]
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
    agentFundingEvents(
      where: { masterSafe: $masterSafe }
      orderBy: blockTimestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      txHash
      blockTimestamp
      totalNativeAmount
      totalOlasAmount
      transfers {
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

const DEFAULT_PAGE_SIZE = 100;

type GetTransactionHistoryParams = {
  chainId: EvmChainId;
  masterSafe: Address;
  first?: number;
  skip?: number;
};

const get = async ({
  chainId,
  masterSafe,
  first = DEFAULT_PAGE_SIZE,
  skip = 0,
}: GetTransactionHistoryParams): Promise<TransactionHistoryResponse> => {
  const url = TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId];
  if (!url) {
    throw new Error(
      `No transaction-history subgraph configured for chain ${chainId}`,
    );
  }

  const raw = await request(url, FETCH_TRANSACTION_HISTORY_QUERY, {
    masterSafe: masterSafe.toLowerCase(),
    first,
    skip,
  });

  return TransactionHistoryResponseSchema.parse(raw);
};

// The Graph caps `first` at 1000. We fetch a single 1000-row page per list for
// now — plenty for the 10-at-a-time view and bounds gateway cost. Older history
// beyond 1000 raw movements is dropped (a warn fires); the real fix (server-side
// filtering of reward sweeps + pagination) is a subgraph follow-up. getAll keeps
// the page loop so the cap is a one-line bump (MAX_PAGES) once that lands.
const PAGE_SIZE = 1000;
const MAX_PAGES = 1;

const getAll = async ({
  chainId,
  masterSafe,
}: Pick<
  GetTransactionHistoryParams,
  'chainId' | 'masterSafe'
>): Promise<TransactionHistoryResponse> => {
  // Defensive: the hook only enables the query when a URL exists for the chain.
  if (!TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId]) {
    throw new Error(
      `No transaction-history subgraph configured for chain ${chainId}`,
    );
  }

  let base: TransactionHistoryResponse | null = null;
  const fundsMovements: TransactionHistoryResponse['fundsMovements'] = [];
  const agentFundingEvents: TransactionHistoryResponse['agentFundingEvents'] =
    [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await get({
      chainId,
      masterSafe,
      first: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    });

    // Singular fields (masterSafe, _meta) come from the first page.
    if (!base) base = res;
    fundsMovements.push(...res.fundsMovements);
    agentFundingEvents.push(...res.agentFundingEvents);

    const exhausted =
      res.fundsMovements.length < PAGE_SIZE &&
      res.agentFundingEvents.length < PAGE_SIZE;
    if (exhausted) break;

    if (page === MAX_PAGES - 1) {
      console.error(
        `[TransactionHistory] hit the ${MAX_PAGES * PAGE_SIZE}-row pagination cap for ${masterSafe}; older history may be truncated.`,
      );
    }
  }

  return {
    ...(base as TransactionHistoryResponse),
    fundsMovements,
    agentFundingEvents,
  };
};

export const TransactionHistoryService = { get, getAll };
