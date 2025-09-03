import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
import {
  BridgeRefillRequirementsRequest,
  BridgeRefillRequirementsResponse,
  BridgeStatusResponse,
} from '@/types/Bridge';

/**
 * Get bridge refill requirements for the provided source and destination parameters
 */
const getBridgeRefillRequirements = async (
  params: BridgeRefillRequirementsRequest,
  signal?: AbortSignal,
): Promise<BridgeRefillRequirementsResponse> =>
  fetch(`${BACKEND_URL}/bridge/bridge_refill_requirements`, {
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
const executeBridge = async (
  id: string,
  signal?: AbortSignal,
): Promise<BridgeStatusResponse> =>
  fetch(`${BACKEND_URL}/bridge/execute`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ id }),
    signal,
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
  fetch(`${BACKEND_URL}/bridge/status/${id}`, {
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
