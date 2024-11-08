import {
  Deployment,
  MiddlewareServiceResponse,
  ServiceHash,
  ServiceTemplate,
} from '@/client';
import { CHAIN_CONFIG } from '@/config/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '@/constants/headers';
import { BACKEND_URL } from '@/constants/urls';
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
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
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
  fetch(`${BACKEND_URL}/services`, {
    method: 'GET',
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
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
}: {
  deploy: boolean;
  serviceTemplate: ServiceTemplate;
  stakingProgramId: StakingProgramId;
  useMechMarketplace?: boolean;
}): Promise<MiddlewareServiceResponse> =>
  new Promise((resolve, reject) =>
    fetch(`${BACKEND_URL}/services`, {
      method: 'POST',
      body: JSON.stringify({
        ...serviceTemplate,
        deploy,
        configurations: {
          [CHAIN_CONFIG.OPTIMISM.chainId]: {
            ...serviceTemplate.configurations[CHAIN_CONFIG.OPTIMISM.chainId],
            staking_program_id: stakingProgramId,
            rpc: `${process.env.OPTIMISM_RPC}`,
            use_mech_marketplace: useMechMarketplace,
          },
        },
      }),
      headers: {
        ...CONTENT_TYPE_JSON_UTF8,
      },
    }).then((response) => {
      if (response.ok) {
        resolve(response.json());
      }
      reject(response);
    }),
  );

// const deployOnChain = async (serviceHash: ServiceHash): Promise<Deployment> =>
//   fetch(`${BACKEND_URL}/services/${serviceHash}/onchain/deploy`, {
//     method: 'POST',
//     headers: {
//       ...CONTENT_TYPE_JSON_UTF8,
//     },
//   }).then((response) => {
//     if (response.ok) {
//       return response.json();
//     }
//     throw new Error('Failed to deploy service on chain');
//   });

// const buildDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
//   fetch(`${BACKEND_URL}/services/${serviceHash}/deployment/build`, {
//     method: 'POST',
//     headers: {
//       ...CONTENT_TYPE_JSON_UTF8,
//     },
//   }).then((response) => {
//     if (response.ok) {
//       return response.json();
//     }
//     throw new Error('Failed to build deployment');
//   });

// const startDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
//   fetch(`${BACKEND_URL}/services/${serviceHash}/deployment/start`, {
//     method: 'POST',
//     headers: {
//       ...CONTENT_TYPE_JSON_UTF8,
//     },
//   }).then((response) => {
//     if (response.ok) {
//       return response.json();
//     }
//     throw new Error('Failed to start deployment');
//   });

const stopDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/deployment/stop`, {
    method: 'POST',
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to stop deployment');
  });

// const deleteDeployment = async (
//   serviceHash: ServiceHash,
// ): Promise<Deployment> =>
//   fetch(`${BACKEND_URL}/services/${serviceHash}/deployment/delete`, {
//     method: 'POST',
//     headers: {
//       ...CONTENT_TYPE_JSON_UTF8,
//     },
//   }).then((response) => {
//     if (response.ok) {
//       return response.json();
//     }
//     throw new Error('Failed to delete deployment');
//   });

const getDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/deployment`, {
    method: 'GET',
    headers: {
      ...CONTENT_TYPE_JSON_UTF8,
    },
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
  createService,
  // deployOnChain,
  // stopOnChain,
  // buildDeployment,
  // startDeployment,
  stopDeployment,
  // deleteDeployment,
};
