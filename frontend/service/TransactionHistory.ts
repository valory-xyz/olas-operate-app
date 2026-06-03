import { gql, request } from 'graphql-request';

import { EvmChainId } from '@/constants/chains';
import { TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
import { Address } from '@/types/Address';
import {
  TransactionHistoryResponse,
  TransactionHistoryResponseSchema,
} from '@/types/TransactionHistory';

import { TRANSACTION_HISTORY_FIXTURE } from './fixtures/transactionHistory';

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

  // TODO(VLOP-73): once pearl-transactions Studio deployments exist, drop the
  // fixture path and rely on the live subgraph. See PR #129 in
  // valory-xyz/autonolas-subgraph-studio.
  if (!url) {
    return TransactionHistoryResponseSchema.parse(
      TRANSACTION_HISTORY_FIXTURE(masterSafe, chainId),
    );
  }

  const raw = await request(url, FETCH_TRANSACTION_HISTORY_QUERY, {
    masterSafe: masterSafe.toLowerCase(),
    first,
    skip,
  });

  return TransactionHistoryResponseSchema.parse(raw);
};

export const TransactionHistoryService = { get };
