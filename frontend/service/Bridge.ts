import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL_V2 } from '@/constants/urls';
import {
  BridgeRefillRequirementsRequest,
  BridgeRefillRequirementsResponse,
  BridgeStatusResponse,
} from '@/types/Bridge';

const IS_MOCK_ENABLED = true; // TODO: remove

const getBridgeStatusMock = {
  id: 'qb-bdaafd7f-0698-4e10-83dd-d742cc0e656d',
  status: 'SUBMITTED',
  bridge_request_status: [
    {
      explorer_link:
        'https://scan.li.fi/tx/0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
      message: null,
      status: 'EXECUTION_DONE',
      tx_hash:
        '0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
    },
    {
      explorer_link: null,
      message: null,
      status: 'EXECUTION_PENDING',
      tx_hash: null,
    },
  ],
  error: false,
} as const satisfies BridgeStatusResponse;

/**
 * Get bridge refill requirements for the provided source and destination parameters
 */
const getBridgeRefillRequirements = async (
  params: BridgeRefillRequirementsRequest,
): Promise<BridgeRefillRequirementsResponse> =>
  fetch(`${BACKEND_URL_V2}/bridge/bridge_refill_requirements`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify(params),
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(
      `Failed to get bridge refill requirements for the following params: ${params}`,
    );
  });

/**
 * Execute bridge for the provided quote bundle id
 */
const executeBridge = async (id: string): Promise<BridgeStatusResponse> =>
  fetch(`${BACKEND_URL_V2}/bridge/execute`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ id }),
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(
      `Failed to execute bridge quote for the following quote id: ${id}`,
    );
  });

/**
 * Get status of the bridge for the provided quote bundle id
 */
const getBridgeStatus = async (id: string): Promise<BridgeStatusResponse> =>
  IS_MOCK_ENABLED
    ? Promise.resolve(getBridgeStatusMock)
    : fetch(`${BACKEND_URL_V2}/bridge/status/${id}`, {
        method: 'GET',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        body: JSON.stringify({ id }),
      }).then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error(
          `Failed to get bridge status for the following quote id: ${id}`,
        );
      });

export const BridgeService = {
  getBridgeRefillRequirements,
  executeBridge,
  getBridgeStatus,
};
