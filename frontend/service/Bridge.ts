import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import {
  BridgeRefillRequirementsRequest,
  BridgeRefillRequirementsResponse,
  BridgeStatusResponse,
} from '@/types/Bridge';

const IS_MOCK_ENABLED = true; // TODO: remove

const bridgeRefillRequirementsMock = {
  id: 'qb-bdaafd7f-0698-4e10-83dd-d742cc0e656d',
  balances: {
    ethereum: {
      '0x5a0e3ec135063e6ca46eb7457C7eC61ab0fE2378': {
        '0x0000000000000000000000000000000000000000': 10000000000000,
        '0x0001A500A6B18995B03f44bb040A5fFc28E45CB0': 50000000000000,
      },
    },
  },
  bridge_total_requirements: {
    ethereum: {
      '0x5a0e3ec135063e6ca46eb7457C7eC61ab0fE2378': {
        '0x0000000000000000000000000000000000000000': 10000000000000,
        '0x0001A500A6B18995B03f44bb040A5fFc28E45CB0': 50000000000000,
      },
    },
  },
  bridge_refill_requirements: {
    ethereum: {
      '0x5a0e3ec135063e6ca46eb7457C7eC61ab0fE2378': {
        '0x0000000000000000000000000000000000000000': 0,
        '0x0001A500A6B18995B03f44bb040A5fFc28E45CB0': 0,
      },
    },
  },
  bridge_request_status: [
    {
      message: '',
      status: 'QUOTE_DONE',
    },
    {
      message: '',
      status: 'QUOTE_DONE',
    },
  ],
  expiration_timestamp: 1743000251,
  is_refill_required: false,
  error: false,
} as const satisfies BridgeRefillRequirementsResponse;

// TODO: remove this mock
const executeBridgeMock = {
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
      explorer_link:
        'https://scan.li.fi/tx/0x0e53f1b6aa5552f2d4cfe8e623dd95e54ca079c4b23b89d0c0aa6ed4a6442384',
      message: null,
      status: 'EXECUTION_PENDING',
      tx_hash:
        '0x0e53f1b6aa5552f2d4cfe8e623dd95e54ca079c4b23b89d0c0aa6ed4a6442384',
    },
  ],
  error: false,
} as const satisfies BridgeStatusResponse;

// TODO: remove this mock
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
  IS_MOCK_ENABLED
    ? Promise.resolve(bridgeRefillRequirementsMock)
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
  IS_MOCK_ENABLED
    ? Promise.resolve(executeBridgeMock)
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
const getBridgeStatus = async (id: string): Promise<BridgeStatusResponse> =>
  IS_MOCK_ENABLED
    ? Promise.resolve(getBridgeStatusMock)
    : fetch(`${BACKEND_URL}/bridge/status/${id}`, {
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
