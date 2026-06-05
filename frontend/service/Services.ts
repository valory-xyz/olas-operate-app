import { CHAIN_CONFIG } from '@/config/chains';
import {
  BACKEND_URL_V2,
  CONTENT_TYPE_JSON_UTF8,
  StakingProgramId,
  SupportedMiddlewareChain,
} from '@/constants';
import {
  AgentPerformance,
  DeepPartial,
  MiddlewareServiceResponse,
  Nullable,
  SafeWithdrawableBalanceResponse,
  ServiceConfigId,
  ServiceDeployment,
  ServiceTemplate,
  ServiceValidationResponse,
  WithdrawSafeRequestAmounts,
} from '@/types';
import { asEvmChainId } from '@/utils';

/**
 * Get a single service from the backend
 */
const getService = async ({
  serviceConfigId,
  signal,
}: {
  serviceConfigId: ServiceConfigId;
  signal: AbortSignal;
}): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(`Failed to fetch service ${serviceConfigId}`);
  });

/**
 * Gets an array of services from the backend
 * @returns An array of services
 */
const getServices = async (
  signal?: AbortSignal,
): Promise<MiddlewareServiceResponse[]> =>
  fetch(`${BACKEND_URL_V2}/services`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error('Failed to fetch services');
  });

/**
 * Gets an array of services from the backend
 * @returns An array of services
 */
const getServicesValidationStatus = async (
  signal?: AbortSignal,
): Promise<ServiceValidationResponse> =>
  fetch(`${BACKEND_URL_V2}/services/validate`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error('Failed to fetch services validation status');
  });

/**
 * Creates a service
 * @param serviceTemplate
 * @returns Promise<Service>
 */
const createService = async ({
  deploy,
  serviceTemplate,
  stakingProgramId,
}: {
  deploy: boolean;
  serviceTemplate: ServiceTemplate;
  stakingProgramId: StakingProgramId;
  useMechMarketplace?: boolean;
}): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service`, {
    method: 'POST',
    body: JSON.stringify({
      ...serviceTemplate,
      deploy,
      configurations: {
        ...serviceTemplate.configurations,
        // overwrite defaults with chain-specific configurations
        ...Object.entries(serviceTemplate.configurations).reduce(
          (acc, [middlewareChain, config]) => {
            acc[middlewareChain as SupportedMiddlewareChain] = {
              ...config,
              rpc: CHAIN_CONFIG[asEvmChainId(middlewareChain)].rpc,
              staking_program_id: stakingProgramId,
            };
            return acc;
          },
          {} as typeof serviceTemplate.configurations,
        ),
      },
    }),
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to create service');
  });

/**
 * Updates a service
 * @param partialServiceTemplate
 * @returns Promise<Service>
 */
const updateService = async ({
  partialServiceTemplate,
  serviceConfigId,
}: {
  partialServiceTemplate: DeepPartial<ServiceTemplate>;
  serviceConfigId: string;
}): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...partialServiceTemplate }),
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to update service');
  });

/**
 * PUT a service — non-partial update. Unlike `updateService` (PATCH), the
 * middleware fully replaces fields present in the body instead of merging
 * them.
 */
const putService = async ({
  partialServiceTemplate,
  serviceConfigId,
}: {
  partialServiceTemplate: DeepPartial<ServiceTemplate>;
  serviceConfigId: string;
}): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}`, {
    method: 'PUT',
    body: JSON.stringify({ ...partialServiceTemplate }),
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to PUT service');
  });

/**
 * Starts a service.
 *
 * On a non-OK response, throws an Error whose `.message` is the backend's
 * error string (or a generic fallback) and which has the full parsed JSON
 * body merged onto it as own properties — so:
 *   - `${err}` / log lines stay diagnosable (was `[object Object]` when we
 *     threw the body directly; AutoRun's `useAutoRunStartOperations`
 *     stringifies the error into its `lastInfraError` reason).
 *   - `isInsufficientGasError(err)` still narrows (the Error is
 *     `typeof 'object'` with `error_code`/`chain`/`prefill_amount_wei`).
 *
 * @throws Error & Partial<InsufficientGasErrorBody>
 */
const startService = async (
  serviceConfigId: string,
): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then(async (response) => {
    if (response.ok) {
      return response.json();
    }
    const body = await response.json().catch(() => ({}));
    const err = new Error(
      (body as { error?: string })?.error || 'Failed to start the service',
    );
    Object.assign(err, body);
    throw err;
  });

const stopDeployment = async (
  serviceConfigId: string,
): Promise<Pick<ServiceDeployment, 'status' | 'nodes'>> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/deployment/stop`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to stop deployment');
  });

/**
 * Gets deployment of all services
 */
const getAllServiceDeployments = async (
  signal?: AbortSignal,
): Promise<Record<ServiceConfigId, ServiceDeployment>> =>
  fetch(`${BACKEND_URL_V2}/services/deployment`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error('Failed to fetch all service deployments');
  });

/**
 * To get the deployment of a service
 */
const getDeployment = async ({
  serviceConfigId,
  signal,
}: {
  serviceConfigId: ServiceConfigId;
  signal: AbortSignal;
}): Promise<ServiceDeployment> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/deployment`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error('Failed to fetch deployment');
  });

/**
 * Withdraws the balance of a service.
 *
 * On a non-OK response, rejects with the parsed JSON error body (or `{}`
 * if the body isn't JSON). Callers that care about the
 * `INSUFFICIENT_SIGNER_GAS` branch should narrow the rejection via
 * `isInsufficientGasError(err)` from `@/constants`.
 *
 * @throws InsufficientGasErrorBody | Record<string, unknown>
 */
const withdrawBalance = async ({
  serviceConfigId,
}: {
  serviceConfigId: ServiceConfigId;
}): Promise<{ error: Nullable<string> }> => {
  const response = await fetch(
    `${BACKEND_URL_V2}/service/${serviceConfigId}/terminate_and_withdraw`,
    {
      method: 'POST',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    },
  );
  if (response.ok) return response.json();
  throw await response.json().catch(() => ({}));
};

/**
 * To get the agent performance statistics of a service
 */
const getAgentPerformance = async ({
  serviceConfigId,
}: {
  serviceConfigId: ServiceConfigId;
}): Promise<AgentPerformance> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/agent_performance`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error('Failed to fetch agent performance');
  });

/**
 * Gets the withdrawable balance for the service safe (per chain).
 */
const getSafeWithdrawableBalance = async ({
  serviceConfigId,
}: {
  serviceConfigId: ServiceConfigId;
}): Promise<SafeWithdrawableBalanceResponse> =>
  fetch(
    `${BACKEND_URL_V2}/service/${serviceConfigId}/safe_withdrawable_balance`,
    {
      method: 'GET',
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    },
  ).then(async (response) => {
    if (response.ok) return response.json();
    throw await response.json().catch(() => ({}));
  });

/**
 * Performs a partial withdrawal from the service safe to the master safe.
 */
const withdrawSafe = async ({
  serviceConfigId,
  amounts,
}: {
  serviceConfigId: ServiceConfigId;
  amounts: WithdrawSafeRequestAmounts;
}): Promise<{ error: Nullable<string>; message: string }> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/withdraw_safe`, {
    method: 'POST',
    body: JSON.stringify({ amounts }),
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then(async (response) => {
    if (response.ok) return response.json();
    throw await response.json().catch(() => ({}));
  });

export const ServicesService = {
  getService,
  getServices,
  getServicesValidationStatus,
  getAllServiceDeployments,
  getDeployment,
  startService,
  createService,
  updateService,
  putService,
  stopDeployment,
  withdrawBalance,
  getAgentPerformance,
  getSafeWithdrawableBalance,
  withdrawSafe,
};
