import { Deployment, Service, ServiceHash, ServiceTemplate } from '@/client';
import { BACKEND_URL } from '@/constants/urls';

/**
 * Get a single service from the backend
 * @param serviceHash
 * @returns
 */
const getService = async (serviceHash: ServiceHash): Promise<Service> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}`).then((response) =>
    response.json(),
  );

/**
 * Gets an array of services from the backend
 * @returns An array of services
 */
const getServices = async (): Promise<Service[]> =>
  fetch(`${BACKEND_URL}/services`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((response) => response.json());

/**
 * Creates a service
 * @param serviceTemplate
 * @returns Promise<Service>
 */
const createService = async ({
  serviceTemplate,
  deploy,
}: {
  serviceTemplate: ServiceTemplate;
  deploy: boolean;
}): Promise<Service> =>
  new Promise((resolve, reject) =>
    fetch(`${BACKEND_URL}/services`, {
      method: 'POST',
      body: JSON.stringify({
        ...serviceTemplate,
        deploy,
        configuration: {
          ...serviceTemplate.configuration,
          rpc: `${process.env.RPC}`,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((response) => {
      if (response.ok) {
        resolve(response.json());
      }
      reject('Failed to create service');
    }),
  );

const deployOnChain = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/onchain/deploy`, {
    method: 'POST',
  }).then((response) => response.json());

const stopOnChain = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/onchain/stop`, {
    method: 'POST',
  }).then((response) => response.json());

const buildDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/deployment/build`, {
    method: 'POST',
  }).then((response) => response.json());

const startDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/deployment/start`, {
    method: 'POST',
  }).then((response) => response.json());

const stopDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/deployment/stop`, {
    method: 'POST',
  }).then((response) => response.json());

const deleteDeployment = async (
  serviceHash: ServiceHash,
): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/deployment/delete`, {
    method: 'POST',
  }).then((response) => response.json());

const getDeployment = async (serviceHash: ServiceHash): Promise<Deployment> =>
  fetch(`${BACKEND_URL}/services/${serviceHash}/deployment`).then((response) =>
    response.json(),
  );

export const ServicesService = {
  getService,
  getServices,
  getDeployment,
  createService,
  deployOnChain,
  stopOnChain,
  buildDeployment,
  startDeployment,
  stopDeployment,
  deleteDeployment,
};
