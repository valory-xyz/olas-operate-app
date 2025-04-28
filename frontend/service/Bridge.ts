import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import {
  BridgeRefillRequirementsRequest,
  BridgeRefillRequirementsResponse,
  BridgeStatusResponse,
} from '@/types/Bridge';

const TEST = true;
const IS_FAILED = false;

const BRIDGE_REQUIREMENTS_MOCK = {
  id: 'qb-56410704-b8da-49d9-85f2-1fd2133b24fb',
  balances: {
    ethereum: {
      '0x467EC82a89699282dd9b3FC31991b3A4b9003d5e': {
        '0x0000000000000000000000000000000000000000': 100000000000000,
      },
    },
  },
  bridge_total_requirements: {
    ethereum: {
      '0x467EC82a89699282dd9b3FC31991b3A4b9003d5e': {
        '0x0000000000000000000000000000000000000000': 64223356851030,
      },
    },
  },
  bridge_refill_requirements: {
    ethereum: {
      '0x467EC82a89699282dd9b3FC31991b3A4b9003d5e': {
        '0x0000000000000000000000000000000000000000': 0,
      },
    },
  },
  expiration_timestamp: 1745238494,
  is_refill_required: false,
  bridge_request_status: [
    {
      message: '',
      status: 'QUOTE_DONE',
    },
  ],
} satisfies BridgeRefillRequirementsResponse;

// TODO: remove this mock
const executeBridgeMock = {
  id: 'br-7a133f01-a13e-48ab-85a1-5f7212e2cba1',
  status: 'EXECUTION_DONE',
  bridge_request_status: [
    {
      explorer_link:
        'https://scan.li.fi/tx/0x0590ce4d5c835647b525e2ef222132062c6f6252d5fd23fab17113fa8f3a1869',
      message:
        'The bridge off-chain logic is being executed. Wait for the transaction to appear in the destination chain.',
      status: 'EXECUTION_DONE',
      tx_hash:
        '0x0590ce4d5c835647b525e2ef222132062c6f6252d5fd23fab17113fa8f3a1869',
    },
  ],
} as const satisfies BridgeStatusResponse;

// TODO: remove this mock
const getBridgeStatusMock = {
  id: 'qb-bdaafd7f-0698-4e10-83dd-d742cc0e656d',
  status: 'EXECUTION_PENDING',
  bridge_request_status: [
    // {
    //   explorer_link:
    //     'https://scan.li.fi/tx/0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
    //   message: null,
    //   status: 'EXECUTION_DONE',
    //   tx_hash:
    //     '0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
    // },
    {
      explorer_link: null,
      message: null,
      status: 'EXECUTION_PENDING',
      tx_hash:
        '0x3795206347eae1537d852bea05e36c3e76b08cefdfa2d772e24bac2e24f31db3',
    },
  ],
} as const satisfies BridgeStatusResponse;

/**
 * Get bridge refill requirements for the provided source and destination parameters
 */
const getBridgeRefillRequirements = async (
  params: BridgeRefillRequirementsRequest,
  signal?: AbortSignal,
): Promise<BridgeRefillRequirementsResponse> =>
  TEST
    ? new Promise((resolve) =>
        setTimeout(() => resolve(BRIDGE_REQUIREMENTS_MOCK), 5_000),
      )
    : fetch(`${BACKEND_URL}/bridge/bridge_refill_requirements`, {
        method: 'POST',
        headers: { ...CONTENT_TYPE_JSON_UTF8 },
        body: JSON.stringify(params),
        signal,
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
  IS_FAILED
    ? new Promise((_resolve, reject) =>
        setTimeout(() => {
          reject(new Error('Failed to execute bridge quote'));
        }, 5_000),
      )
    : TEST
      ? new Promise((resolve) =>
          setTimeout(() => {
            resolve(executeBridgeMock);
          }, 5_000),
        )
      : fetch(`${BACKEND_URL}/bridge/execute`, {
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
const getBridgeStatus = async (
  id: string,
  signal?: AbortSignal,
): Promise<BridgeStatusResponse> =>
  IS_FAILED
    ? new Promise((_resolve, reject) =>
        setTimeout(() => {
          reject(new Error('Not found'));
        }, 5_000),
      )
    : TEST
      ? new Promise((resolve) =>
          setTimeout(() => resolve(getBridgeStatusMock), 5_000),
        )
      : fetch(`${BACKEND_URL}/bridge/status/${id}`, {
          method: 'GET',
          headers: { ...CONTENT_TYPE_JSON_UTF8 },
          signal,
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
