import { gql, request } from 'graphql-request';

import { REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
import { EvmChainId } from '@/enums/Chain';
import {
  EpochDetailsResponse,
  EpochDetailsResponseSchema,
} from '@/types/Epoch';

export const getLatestEpochTimeQuery = (contractAddress: string) => gql`
  query {
    checkpoints(
      orderBy: epoch
      orderDirection: desc
      first: 1
      where: {
        contractAddress: "${contractAddress}"
      }
    ) {
      epoch
      epochLength
      blockTimestamp
    }
  }
`;

export const getLatestEpochDetails = async (
  chainId: EvmChainId,
  contractAddress: string,
) => {
  const response = await request<{
    checkpoints: EpochDetailsResponse[];
  }>(
    REWARDS_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId],
    getLatestEpochTimeQuery(contractAddress),
  );

  return EpochDetailsResponseSchema.parse(response.checkpoints[0]);
};
