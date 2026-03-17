import { ethers } from 'ethers';

import { CHAIN_CONFIG } from '../../config/chains';
import { AgentMap } from '../../constants/agent';
import { MiddlewareChainMap } from '../../constants/chains';
import { CONTENT_TYPE_JSON_UTF8 } from '../../constants/headers';
import {
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '../../constants/stakingProgram';
import { BACKEND_URL_V2 } from '../../constants/urls';
import { ServicesService } from '../../service/Services';
import { ServiceTemplate } from '../../types/Service';
import { asEvmChainId } from '../../utils/middlewareHelpers';
import { DEFAULT_SERVICE_CONFIG_ID } from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const mockJsonResponse = (body: unknown, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);

beforeEach(() => {
  global.fetch = jest.fn();
  jest.restoreAllMocks();
});

const expectedHeaders = { ...CONTENT_TYPE_JSON_UTF8 };

const MOCK_SERVICE_RESPONSE = {
  service_public_id: 'valory/trader:0.1.0',
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
  version: 1,
  name: 'Trader Agent',
};

const MOCK_DEPLOYMENT_RESPONSE = {
  status: 'deployed',
  nodes: ['node1'],
};

const makeServiceTemplate = (
  overrides: Partial<ServiceTemplate> = {},
): ServiceTemplate => ({
  agentType: AgentMap.PredictTrader,
  name: 'Trader Agent',
  hash: 'bafybeib5hmzpf7cmxyfevq65tk22fjvlothjskw7nacgh4ervgs5mos7ra',
  description: 'Trader agent for omen prediction markets',
  image: '/agents/trader.png',
  service_version: 'v0.31.7',
  agent_release: {
    is_aea: true,
    repository: {
      owner: 'valory-xyz',
      name: 'trader',
      version: 'v0.31.7-rc2',
    },
  },
  home_chain: MiddlewareChainMap.GNOSIS,
  configurations: {
    [MiddlewareChainMap.GNOSIS]: {
      nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
      agent_id: 14,
      cost_of_bond: '50000000000000000000',
      fund_requirements: {
        [ethers.constants.AddressZero]: {
          agent: '1000000000000000000',
          safe: '5000000000000000000',
        },
      },
    },
  },
  env_variables: {},
  ...overrides,
});

describe('ServicesService', () => {
  describe('getService', () => {
    it('returns service data on success', async () => {
      const abortController = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      const result = await ServicesService.getService({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        signal: abortController.signal,
      });

      expect(result).toEqual(MOCK_SERVICE_RESPONSE);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: abortController.signal,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      const abortController = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        ServicesService.getService({
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
          signal: abortController.signal,
        }),
      ).rejects.toThrow(`Failed to fetch service ${DEFAULT_SERVICE_CONFIG_ID}`);
    });
  });

  describe('getServices', () => {
    it('returns array of services on success', async () => {
      const responseBody = [MOCK_SERVICE_RESPONSE];
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await ServicesService.getServices();

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL_V2}/services`, {
        method: 'GET',
        headers: expectedHeaders,
        signal: undefined,
      });
    });

    it('passes abort signal when provided', async () => {
      const abortController = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse([MOCK_SERVICE_RESPONSE]));

      await ServicesService.getServices(abortController.signal);

      expect(fetch).toHaveBeenCalledWith(`${BACKEND_URL_V2}/services`, {
        method: 'GET',
        headers: expectedHeaders,
        signal: abortController.signal,
      });
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(ServicesService.getServices()).rejects.toThrow(
        'Failed to fetch services',
      );
    });
  });

  describe('getServicesValidationStatus', () => {
    it('returns validation status on success', async () => {
      const responseBody = { validated: true };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await ServicesService.getServicesValidationStatus();

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/services/validate`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: undefined,
        },
      );
    });

    it('passes abort signal when provided', async () => {
      const abortController = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({ validated: true }));

      await ServicesService.getServicesValidationStatus(abortController.signal);

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/services/validate`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: abortController.signal,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        ServicesService.getServicesValidationStatus(),
      ).rejects.toThrow('Failed to fetch services validation status');
    });
  });

  describe('createService', () => {
    const stakingProgramId: StakingProgramId = STAKING_PROGRAM_IDS.PearlBeta;

    it('returns created service on success', async () => {
      const serviceTemplate = makeServiceTemplate();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      const result = await ServicesService.createService({
        deploy: true,
        serviceTemplate,
        stakingProgramId,
      });

      expect(result).toEqual(MOCK_SERVICE_RESPONSE);
    });

    it('overrides configurations with rpc and staking_program_id', async () => {
      const serviceTemplate = makeServiceTemplate();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      await ServicesService.createService({
        deploy: true,
        serviceTemplate,
        stakingProgramId,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1].body);

      // Verify each configuration chain has rpc and staking_program_id overrides
      for (const [middlewareChain, config] of Object.entries(
        sentBody.configurations,
      )) {
        const expectedRpc = CHAIN_CONFIG[asEvmChainId(middlewareChain)].rpc;
        expect((config as Record<string, unknown>).rpc).toBe(expectedRpc);
        expect((config as Record<string, unknown>).staking_program_id).toBe(
          stakingProgramId,
        );
      }
    });

    it('preserves original configuration fields alongside overrides', async () => {
      const serviceTemplate = makeServiceTemplate();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      await ServicesService.createService({
        deploy: true,
        serviceTemplate,
        stakingProgramId,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1].body);
      const gnosisConfig = sentBody.configurations[MiddlewareChainMap.GNOSIS];

      // Original fields preserved
      expect(gnosisConfig.nft).toBe(
        serviceTemplate.configurations[MiddlewareChainMap.GNOSIS]!.nft,
      );
      expect(gnosisConfig.agent_id).toBe(
        serviceTemplate.configurations[MiddlewareChainMap.GNOSIS]!.agent_id,
      );
      expect(gnosisConfig.cost_of_bond).toBe(
        serviceTemplate.configurations[MiddlewareChainMap.GNOSIS]!.cost_of_bond,
      );
    });

    it('sends deploy flag in the request body', async () => {
      const serviceTemplate = makeServiceTemplate();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      await ServicesService.createService({
        deploy: false,
        serviceTemplate,
        stakingProgramId,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1].body);
      expect(sentBody.deploy).toBe(false);
    });

    it('sends POST to the correct URL with correct headers', async () => {
      const serviceTemplate = makeServiceTemplate();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      await ServicesService.createService({
        deploy: true,
        serviceTemplate,
        stakingProgramId,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service`,
        expect.objectContaining({
          method: 'POST',
          headers: expectedHeaders,
        }),
      );
    });

    it('handles multi-chain configurations', async () => {
      const serviceTemplate = makeServiceTemplate({
        configurations: {
          [MiddlewareChainMap.GNOSIS]: {
            nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
            agent_id: 14,
            cost_of_bond: '50000000000000000000',
            fund_requirements: {
              [ethers.constants.AddressZero]: {
                agent: '1000000000000000000',
                safe: '5000000000000000000',
              },
            },
          },
          [MiddlewareChainMap.BASE]: {
            nft: 'bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq',
            agent_id: 14,
            cost_of_bond: '50000000000000000000',
            fund_requirements: {
              [ethers.constants.AddressZero]: {
                agent: '500000000000000',
                safe: '2000000000000000',
              },
            },
          },
        },
      });

      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      await ServicesService.createService({
        deploy: true,
        serviceTemplate,
        stakingProgramId,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1].body);

      // Both chains have overrides
      expect(sentBody.configurations[MiddlewareChainMap.GNOSIS].rpc).toBe(
        CHAIN_CONFIG[asEvmChainId(MiddlewareChainMap.GNOSIS)].rpc,
      );
      expect(
        sentBody.configurations[MiddlewareChainMap.GNOSIS].staking_program_id,
      ).toBe(stakingProgramId);
      expect(sentBody.configurations[MiddlewareChainMap.BASE].rpc).toBe(
        CHAIN_CONFIG[asEvmChainId(MiddlewareChainMap.BASE)].rpc,
      );
      expect(
        sentBody.configurations[MiddlewareChainMap.BASE].staking_program_id,
      ).toBe(stakingProgramId);
    });

    it('throws error on non-ok response', async () => {
      const serviceTemplate = makeServiceTemplate();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        ServicesService.createService({
          deploy: true,
          serviceTemplate,
          stakingProgramId,
        }),
      ).rejects.toThrow('Failed to create service');
    });
  });

  describe('updateService', () => {
    it('returns updated service on success', async () => {
      const partialTemplate = { name: 'Updated Trader' };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      const result = await ServicesService.updateService({
        partialServiceTemplate: partialTemplate,
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(result).toEqual(MOCK_SERVICE_RESPONSE);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}`,
        {
          method: 'PATCH',
          body: JSON.stringify(partialTemplate),
          headers: expectedHeaders,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        ServicesService.updateService({
          partialServiceTemplate: { name: 'x' },
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        }),
      ).rejects.toThrow('Failed to update service');
    });
  });

  describe('startService', () => {
    it('returns service data on success', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_SERVICE_RESPONSE));

      const result = await ServicesService.startService(
        DEFAULT_SERVICE_CONFIG_ID,
      );

      expect(result).toEqual(MOCK_SERVICE_RESPONSE);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}`,
        {
          method: 'POST',
          headers: expectedHeaders,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        ServicesService.startService(DEFAULT_SERVICE_CONFIG_ID),
      ).rejects.toThrow('Failed to start the service');
    });
  });

  describe('stopDeployment', () => {
    it('returns deployment status on success', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_DEPLOYMENT_RESPONSE));

      const result = await ServicesService.stopDeployment(
        DEFAULT_SERVICE_CONFIG_ID,
      );

      expect(result).toEqual(MOCK_DEPLOYMENT_RESPONSE);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/deployment/stop`,
        {
          method: 'POST',
          headers: expectedHeaders,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        ServicesService.stopDeployment(DEFAULT_SERVICE_CONFIG_ID),
      ).rejects.toThrow('Failed to stop deployment');
    });
  });

  describe('getAllServiceDeployments', () => {
    it('returns deployments map on success', async () => {
      const responseBody = {
        [DEFAULT_SERVICE_CONFIG_ID]: MOCK_DEPLOYMENT_RESPONSE,
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await ServicesService.getAllServiceDeployments();

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/services/deployment`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: undefined,
        },
      );
    });

    it('passes abort signal when provided', async () => {
      const abortController = new AbortController();
      jest.spyOn(global, 'fetch').mockReturnValue(mockJsonResponse({}));

      await ServicesService.getAllServiceDeployments(abortController.signal);

      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/services/deployment`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: abortController.signal,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(ServicesService.getAllServiceDeployments()).rejects.toThrow(
        'Failed to fetch all service deployments',
      );
    });
  });

  describe('getDeployment', () => {
    it('returns deployment data on success', async () => {
      const abortController = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(MOCK_DEPLOYMENT_RESPONSE));

      const result = await ServicesService.getDeployment({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        signal: abortController.signal,
      });

      expect(result).toEqual(MOCK_DEPLOYMENT_RESPONSE);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/deployment`,
        {
          method: 'GET',
          headers: expectedHeaders,
          signal: abortController.signal,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      const abortController = new AbortController();
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        ServicesService.getDeployment({
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
          signal: abortController.signal,
        }),
      ).rejects.toThrow('Failed to fetch deployment');
    });
  });

  describe('withdrawBalance', () => {
    it('resolves with response body on success', async () => {
      const responseBody = { error: null };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await ServicesService.withdrawBalance({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/terminate_and_withdraw`,
        {
          method: 'POST',
          headers: expectedHeaders,
        },
      );
    });

    it('rejects with a plain string (not an Error object) on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      const rejection = ServicesService.withdrawBalance({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      // Must be a plain string, not an Error instance
      await expect(rejection).rejects.toBe('Failed to withdraw balance.');
    });

    it('rejects and does not resolve when response is not ok', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 400));

      await expect(
        ServicesService.withdrawBalance({
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        }),
      ).rejects.toBe('Failed to withdraw balance.');
    });
  });

  describe('getAgentPerformance', () => {
    it('returns agent performance data on success', async () => {
      const responseBody = {
        totalTransactions: 100,
        successRate: 0.95,
      };
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse(responseBody));

      const result = await ServicesService.getAgentPerformance({
        serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
      });

      expect(result).toEqual(responseBody);
      expect(fetch).toHaveBeenCalledWith(
        `${BACKEND_URL_V2}/service/${DEFAULT_SERVICE_CONFIG_ID}/agent_performance`,
        {
          method: 'GET',
          headers: expectedHeaders,
        },
      );
    });

    it('throws error on non-ok response', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockReturnValue(mockJsonResponse({}, false, 500));

      await expect(
        ServicesService.getAgentPerformance({
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        }),
      ).rejects.toThrow('Failed to fetch agent performance');
    });
  });
});
