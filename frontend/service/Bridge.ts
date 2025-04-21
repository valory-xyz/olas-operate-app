import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import {
  BridgeRefillRequirementsRequest,
  BridgeRefillRequirementsResponse,
  BridgeStatusResponse,
  QuoteStatus,
} from '@/types/Bridge';

const TEST = true;

const BRIDGE_REQUIREMENTS_MOCK = {
  id: 'qb-56410704-b8da-49d9-85f2-1fd2133b24fb',
  balances: {
    ethereum: {
      '0x45D1B6861A97fD10846e1185f54E5B639AaA80A4': {
        '0x0000000000000000000000000000000000000000': 100000000000000,
      },
    },
  },
  bridge_total_requirements: {
    ethereum: {
      '0x45D1B6861A97fD10846e1185f54E5B639AaA80A4': {
        '0x0000000000000000000000000000000000000000': 64223356851030,
      },
    },
  },
  bridge_refill_requirements: {
    ethereum: {
      '0x45D1B6861A97fD10846e1185f54E5B639AaA80A4': {
        '0x0000000000000000000000000000000000000000': 0,
      },
    },
  },
  expiration_timestamp: 1745238494,
  is_refill_required: false,
  bridge_request_status: [
    {
      message: '',
      status: 'QUOTE_DONE' as QuoteStatus,
    },
  ],
  error: false,
};

/**
 * Get bridge refill requirements for the provided source and destination parameters
 */
const getBridgeRefillRequirements = async (
  params: BridgeRefillRequirementsRequest,
): Promise<BridgeRefillRequirementsResponse> =>
  TEST
    ? Promise.resolve(BRIDGE_REQUIREMENTS_MOCK) // mock
    : fetch(`${BACKEND_URL}/bridge/bridge_refill_requirements`, {
        method: 'POST',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        body: JSON.stringify(params),
      }).then((response) => {
        if (response.ok) return response.json();
        throw new Error(
          `Failed to get bridge refill requirements for the following params: ${params}`,
        );
      });

/**
 * Execute bridge for the provided quote bundle id
 */
const executeBridge = async (id: string): Promise<BridgeStatusResponse> =>
  fetch(`${BACKEND_URL}/bridge/execute`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ id }),
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error(
      `Failed to execute bridge quote for the following quote id: ${id}`,
    );
  });

/**
 * Get status of the bridge for the provided quote bundle id
 */
const getBridgeStatus = async (id: string): Promise<BridgeStatusResponse> =>
  fetch(`${BACKEND_URL}/bridge/status/${id}`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ id }),
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error(
      `Failed to get bridge status for the following quote id: ${id}`,
    );
  });

export const BridgeService = {
  getBridgeRefillRequirements,
  executeBridge,
  getBridgeStatus,
};
