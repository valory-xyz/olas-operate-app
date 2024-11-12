import {
  Deployment,
  MiddlewareServiceResponse,
  ServiceHash,
  ServiceTemplate,
} from '@/client';
import { CHAIN_CONFIG } from '@/config/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL, BACKEND_URL_V2 } from '@/constants/urls';
import { ChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';

/**
 * Get a single service from the backend
 * @param serviceHash
 * @returns
 */
const getService = async (
  serviceHash: ServiceHash,
): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error(`Failed to fetch service ${serviceHash}`);
  });

/**
 * Gets an array of services from the backend
 * @returns An array of services
 */
const getServices = async (): Promise<MiddlewareServiceResponse[]> =>
  fetch(`${BACKEND_URL_V2}/services`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to fetch services');
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
  useMechMarketplace = false,
  chainId,
}: {
  deploy: boolean;
  serviceTemplate: ServiceTemplate;
  stakingProgramId: StakingProgramId;
  useMechMarketplace?: boolean;
  chainId: ChainId;
}): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service`, {
    method: 'POST',
    body: JSON.stringify({
      ...serviceTemplate,
      deploy,
      configurations: {
        [chainId]: {
          ...serviceTemplate.configurations[ChainId.Optimism],
          staking_program_id: stakingProgramId,
          rpc: CHAIN_CONFIG[chainId].rpc,
          use_mech_marketplace: useMechMarketplace,
        },
      },
    }),
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to create service');
  });

/**
 * Updates a service
 * @param serviceTemplate
 * @returns Promise<Service>
 */
const updateService = async ({
  deploy,
  serviceTemplate,
  serviceHash,
  stakingProgramId,
  useMechMarketplace = false,
  chainId,
}: {
  deploy: boolean;
  serviceTemplate: ServiceTemplate;
  serviceHash: ServiceHash;
  stakingProgramId: StakingProgramId;
  useMechMarketplace?: boolean;
  chainId: ChainId;
}): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceHash}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...serviceTemplate,
      deploy,
      configurations: {
        [chainId]: {
          ...serviceTemplate.configurations[ChainId.Optimism],
          staking_program_id: stakingProgramId,
          rpc: CHAIN_CONFIG[chainId].rpc,
          use_mech_marketplace: useMechMarketplace,
        },
      },
    }),
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
  serviceHash: ServiceHash,
): Promise<MiddlewareServiceResponse> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceHash}`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to start the service');
  });

const stopDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL_V2}/service/${serviceHash}/deployment/stop`, {
    method: 'POST',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to stop deployment');
  });

const getDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL_V2}/services/${serviceHash}/deployment`, {
    method: 'GET',
    headers: { ...CONTENT_TYPE_JSON_UTF8 },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to get deployment');
  });

export const ServicesService = {
  getService,
  getServices,
  getDeployment,
  startService,
  createService,
  updateService,
  stopDeployment,
};
