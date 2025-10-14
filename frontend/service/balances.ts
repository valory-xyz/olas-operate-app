import { BalancesAndFundingRequirements } from '@/client';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL_V2 } from '@/constants/urls';

// import mockResponse from './balances.json';

type GetBalancesAndFundingRequirementsParams = {
  serviceConfigId: string;
  signal: AbortSignal;
};

/**
 * API call to get balances and funding requirements
 */
const getBalancesAndFundingRequirements = async ({
  serviceConfigId,
  signal,
}: GetBalancesAndFundingRequirementsParams): Promise<BalancesAndFundingRequirements> => {
  // return Promise.resolve(
  //   mockResponse as unknown as BalancesAndFundingRequirements,
  // );

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

// In your BalanceService
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

  const validEntries = results
    .map((result, index) =>
      result.status === 'fulfilled'
        ? ([serviceConfigIds[index], result.value] as const)
        : null,
    )
    .filter(
      (entry): entry is readonly [string, BalancesAndFundingRequirements] =>
        entry !== null,
    );

  return Object.fromEntries(validEntries);
};

export const BalanceService = {
  getBalancesAndFundingRequirements,
  getAllBalancesAndFundingRequirements,
};
