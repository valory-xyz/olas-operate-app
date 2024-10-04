import { gql, request } from 'graphql-request';

import { SUBGRAPH_URL } from '@/constants/urls';
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

export const getLatestEpochDetails = async (contractAddress: string) => {
  const response = await request<{
    checkpoints: EpochDetailsResponse[];
  }>(SUBGRAPH_URL, getLatestEpochTimeQuery(contractAddress));

  return EpochDetailsResponseSchema.parse(response.checkpoints[0]);
};
