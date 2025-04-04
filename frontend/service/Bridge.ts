import {
  MiddlewareBridgeRefillRequirementsRequest,
  MiddlewareBridgeRefillRequirementsResponse,
  MiddlewareBridgeStatusResponse,
} from '@/client';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL_V2 } from '@/constants/urls';

/**
 * Get bridge refill requirements for the provided source and destination parameters
 */
const getBridgeRefillRequirements = async (
  params: MiddlewareBridgeRefillRequirementsRequest,
): Promise<MiddlewareBridgeRefillRequirementsResponse> =>
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
const executeBridge = async (
  id: string,
): Promise<MiddlewareBridgeStatusResponse> =>
  fetch(`${BACKEND_URL_V2}/bridge/execute`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    body: JSON.stringify({ id }),
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(
      `Failed to execute bridge bridge quote for the following quote id: ${id}`,
    );
  });

/**
 * Get status of the bridge for the provided quote bundle id
 */
const getBridgeStatus = async (
  id: string,
): Promise<MiddlewareBridgeStatusResponse> =>
  fetch(`${BACKEND_URL_V2}/bridge/execute`, {
    method: 'POST',
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
