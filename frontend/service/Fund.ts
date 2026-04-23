import {
  BACKEND_URL_V2,
  CONTENT_TYPE_JSON_UTF8,
  SupportedMiddlewareChain,
} from '@/constants';
import { Address, ServiceConfigId } from '@/types';

export type TokenAmountMap = {
  [address: Address]: string; // amount (in wei/units)
};

export type ChainFunds = Partial<{
  [chain in SupportedMiddlewareChain]: {
    [address: Address]: TokenAmountMap;
  };
}>;

/**
 * Fund an agent by sending funds to its service safe.
 */
const fundAgent = async ({
  funds,
  serviceConfigId,
}: {
  funds: ChainFunds;
  serviceConfigId: ServiceConfigId;
}): Promise<{ error: string | null }> =>
  new Promise((resolve, reject) =>
    fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/fund`, {
      method: 'POST',
      body: JSON.stringify(funds),
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    }).then(
      async (response) => {
        if (response.ok) {
          resolve(await response.json());
          return;
        }
        reject(await response.json().catch(() => ({})));
      },
      (error) => reject(error),
    ),
  );

export const FundService = {
  fundAgent,
};
