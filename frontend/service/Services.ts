import {
  Deployment,
  MiddlewareServiceResponse,
  ServiceConfigId,
  ServiceTemplate,
  ServiceValidationResponse,
  SupportedMiddlewareChain,
} from '@/client';
import { CHAIN_CONFIG } from '@/config/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL_V2 } from '@/constants/urls';
import { StakingProgramId } from '@/enums/StakingProgram';
import { Address } from '@/types/Address';
import { DeepPartial } from '@/types/Util';
import { asEvmChainId } from '@/utils/middlewareHelpers';

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
 * Starts a service
 * @param serviceTemplate
 * @returns Promise<Service>
 */
const startService = async (
  serviceConfigId: string,
): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to start the service');
  });

const stopDeployment = async (
  serviceConfigId: string,
): Promise<Pick<Deployment, 'status' | 'nodes'>> =>
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
 * To get the deployment of a service
 */
const getDeployment = async ({
  serviceConfigId,
  signal,
}: {
  serviceConfigId: ServiceConfigId;
  signal: AbortSignal;
}): Promise<Deployment> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/deployment`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
    signal,
  }).then((response) => {
    if (response.ok) return response.json();
    throw new Error('Failed to fetch deployment');
  });

/**
 * Withdraws the balance of a service
 *
 * @param withdrawAddress Address
 * @param serviceTemplate ServiceTemplate
 * @returns Promise<Service>
 */
const withdrawBalance = async ({
  withdrawAddress,
  serviceConfigId,
}: {
  withdrawAddress: Address;
  serviceConfigId: ServiceConfigId;
}): Promise<{ error: string | null }> =>
  new Promise((resolve, reject) =>
    fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/onchain/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ withdrawal_address: withdrawAddress }),
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    }).then((response) => {
      if (response.ok) {
        resolve(response.json());
      } else {
        reject('Failed to withdraw balance');
      }
    }),
  );

export const ServicesService = {
  getService,
  getServices,
  getServicesValidationStatus,
  getDeployment,
  startService,
  createService,
  updateService,
  stopDeployment,
  withdrawBalance,
};
