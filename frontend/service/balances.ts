import { BalancesAndFundingRequirements } from '@/client';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL_V2 } from '@/constants/urls';

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

export const BalanceService = {
  getBalancesAndFundingRequirements,
};
