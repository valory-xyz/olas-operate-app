import { compact } from 'lodash';

import { BACKEND_URL_V2, CONTENT_TYPE_JSON_UTF8 } from '@/constants';
import { BalancesAndFundingRequirements } from '@/types';

type GetBalancesAndFundingRequirementsParams = {
  serviceConfigId: string;
  signal: AbortSignal;
};

/**
 * Fetch balances and funding requirements for a specific service config ID
 */
const getBalancesAndFundingRequirements = async ({
  serviceConfigId,
  signal,
}: GetBalancesAndFundingRequirementsParams): Promise<BalancesAndFundingRequirements> => {
  return fetch(
    `${BACKEND_URL_V2}/service/${serviceConfigId}/funding_requirements`,
    {
      method: 'GET',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
      signal,
    },
  ).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(
      `Failed to fetch balances and funding requirements for ${serviceConfigId}`,
    );
  });
};

/**
 * Fetch balances and funding requirements for multiple service config IDs in parallel
 *
 * @returns
 * { [serviceConfigId]: BalancesAndFundingRequirements  }
 */
const getAllBalancesAndFundingRequirements = async ({
  serviceConfigIds,
  signal,
}: {
  serviceConfigIds: string[];
  signal: AbortSignal;
}): Promise<Record<string, BalancesAndFundingRequirements>> => {
  const results = await Promise.allSettled(
    serviceConfigIds.map((id) =>
      getBalancesAndFundingRequirements({ serviceConfigId: id, signal }),
    ),
  );

  const validEntries = compact(
    results.map((result, index) =>
      result.status === 'fulfilled'
        ? ([serviceConfigIds[index], result.value] as const)
        : null,
    ),
  );

  return Object.fromEntries(validEntries);
};

export const BalanceService = {
  getBalancesAndFundingRequirements,
  getAllBalancesAndFundingRequirements,
};
