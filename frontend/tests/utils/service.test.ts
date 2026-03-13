import {
  AgentMap,
  MiddlewareChainMap,
  StakingProgramId,
} from '../../constants';
import { AddressZero } from '../../constants/address';
import { Service, ServiceTemplate } from '../../types/Service';
import {
  isValidServiceId,
  onDummyServiceCreation,
  updateServiceIfNeeded,
} from '../../utils/service';
import {
  MOCK_INSTANCE_ADDRESS,
  MOCK_MULTISIG_ADDRESS,
} from '../helpers/factories';
import { mockCreateService, mockUpdateService } from '../mocks/servicesService';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  '../../service/Services',
  () => require('../mocks/servicesService').servicesServiceMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../constants/serviceTemplates', () => {
  const { AddressZero: addr } = require('../../constants/address');
  return {
    KPI_DESC_PREFIX: '[Pearl service]',
    SERVICE_TEMPLATES: [
      {
        agentType: 'memeooorr',
        name: 'Agents.Fun',
        hash: 'bafybeiem4rsgu5ffgllwroru2ahaxb4wcw5zpxfszo6iiki7tvnmvbfe5q',
        description: '[Pearl service] Agents.Fun @twitter_handle',
        home_chain: 'base',
        env_variables: {
          RESET_PAUSE_DURATION: {
            name: 'Reset pause duration',
            description: '',
            value: '300',
            provision_type: 'fixed',
          },
          STORE_PATH: {
            name: 'Store path',
            description: '',
            value: 'persistent_data/',
            provision_type: 'computed',
          },
          PERSONA: {
            name: 'Persona description',
            description: '',
            value: '',
            provision_type: 'user',
          },
        },
        configurations: {
          base: {
            fund_requirements: {
              [addr]: {
                agent: '325700000000000',
                safe: '1628500000000000',
              },
            },
          },
        },
        agent_release: {
          is_aea: true,
          repository: {
            owner: 'valory-xyz',
            name: 'meme-ooorr',
            version: 'v2.3.1',
          },
        },
      },
    ],
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

const TEMPLATE_HASH =
  'bafybeiem4rsgu5ffgllwroru2ahaxb4wcw5zpxfszo6iiki7tvnmvbfe5q';

const TEMPLATE_FUND_REQUIREMENTS = {
  [AddressZero]: {
    agent: '325700000000000',
    safe: '1628500000000000',
  },
};

const TEMPLATE_AGENT_RELEASE = {
  is_aea: true,
  repository: {
    owner: 'valory-xyz',
    name: 'meme-ooorr',
    version: 'v2.3.1',
  },
};

const SERVICE_CONFIG_ID = 'sc-aa001122-bb33-cc44-dd55-eeff66778899';

const createService = (overrides: Record<string, unknown> = {}) =>
  ({
    service_config_id: SERVICE_CONFIG_ID,
    name: 'Agents.Fun',
    hash: TEMPLATE_HASH,
    description: '[Pearl service] Agents.Fun @twitter_handle',
    home_chain: MiddlewareChainMap.BASE,
    env_variables: {
      RESET_PAUSE_DURATION: { value: '300' },
      STORE_PATH: { value: 'persistent_data/' },
      PERSONA: { value: '' },
    },
    chain_configs: {
      [MiddlewareChainMap.BASE]: {
        chain_data: {
          user_params: {
            fund_requirements: TEMPLATE_FUND_REQUIREMENTS,
          },
        },
      },
    },
    agent_release: TEMPLATE_AGENT_RELEASE,
    ...overrides,
  }) as unknown as Service;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('isValidServiceId', () => {
  it('returns true for positive numbers', () => {
    expect(isValidServiceId(1)).toBe(true);
    expect(isValidServiceId(100)).toBe(true);
  });

  it('returns false for 0', () => {
    expect(isValidServiceId(0)).toBe(false);
  });

  it('returns false for -1', () => {
    expect(isValidServiceId(-1)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidServiceId(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidServiceId(undefined)).toBe(false);
  });
});

describe('updateServiceIfNeeded', () => {
  it('does not update when no template is matched', async () => {
    const service = createService({ name: 'Unknown service' });
    await updateServiceIfNeeded(service, AgentMap.PredictTrader);
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it('does not update when the service already matches the template', async () => {
    const service = createService();
    await updateServiceIfNeeded(service, AgentMap.AgentsFun);
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it('updates hash when it differs from template', async () => {
    const service = createService({
      hash: 'bafybeiold000000000000000000000000000000000000000000000000000',
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: {
        hash: TEMPLATE_HASH,
      },
    });
  });

  it('updates name when AgentsFun service name differs from template', async () => {
    const service = createService({
      name: 'Old Agents.Fun Name',
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: expect.objectContaining({
        name: 'Agents.Fun',
      }),
    });
  });

  it('prepends KPI prefix to description when missing', async () => {
    const service = createService({
      description: 'Agents.Fun @2252_raver',
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: {
        description: '[Pearl service] Agents.Fun @2252_raver',
      },
    });
  });

  it('updates fixed env variable when value differs', async () => {
    const service = createService({
      env_variables: {
        RESET_PAUSE_DURATION: { value: '60' },
        STORE_PATH: { value: 'persistent_data/' },
        PERSONA: { value: '' },
      },
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: {
        env_variables: {
          RESET_PAUSE_DURATION: {
            name: 'Reset pause duration',
            description: '',
            value: '300',
            provision_type: 'fixed',
          },
        },
      },
    });
  });

  it('adds missing computed env variable from template', async () => {
    const service = createService({
      env_variables: {
        RESET_PAUSE_DURATION: { value: '300' },
        PERSONA: { value: '' },
      },
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: {
        env_variables: {
          STORE_PATH: {
            name: 'Store path',
            description: '',
            value: 'persistent_data/',
            provision_type: 'computed',
          },
        },
      },
    });
  });

  it('does not update user env variables even when value differs', async () => {
    const service = createService({
      env_variables: {
        RESET_PAUSE_DURATION: { value: '300' },
        STORE_PATH: { value: 'persistent_data/' },
        PERSONA: { value: 'You are a cat lover.' },
      },
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);

    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it('updates fund requirements when they differ', async () => {
    const service = createService({
      chain_configs: {
        [MiddlewareChainMap.BASE]: {
          chain_data: {
            user_params: {
              fund_requirements: {
                [AddressZero]: {
                  agent: '100000000000000',
                  safe: '500000000000000',
                },
              },
            },
          },
        },
      },
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: {
        configurations: {
          [MiddlewareChainMap.BASE]: {
            fund_requirements: TEMPLATE_FUND_REQUIREMENTS,
          },
        },
      },
    });
  });

  it('updates agent release when version differs', async () => {
    const service = createService({
      agent_release: {
        is_aea: true,
        repository: {
          owner: 'valory-xyz',
          name: 'meme-ooorr',
          version: 'v2.0.0',
        },
      },
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: {
        agent_release: TEMPLATE_AGENT_RELEASE,
      },
    });
  });

  it('does not update service_public_id even when it differs', async () => {
    const service = createService({
      service_public_id: 'valory/old-service:0.0.1',
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it('does not update hash_history even when it differs', async () => {
    const service = createService({
      hash_history: { '1700000000': 'bafybeiold' },
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);
    expect(mockUpdateService).not.toHaveBeenCalled();
  });

  it('does not update chain_configs metadata when only hash changes', async () => {
    const service = createService({
      hash: 'bafybeiold000000000000000000000000000000000000000000000000000',
      chain_configs: {
        [MiddlewareChainMap.BASE]: {
          ledger_config: {
            rpc: 'https://custom-rpc.example.com',
            chain: 'base',
          },
          chain_data: {
            instances: [MOCK_INSTANCE_ADDRESS],
            token: '999',
            multisig: MOCK_MULTISIG_ADDRESS,
            staked: true,
            on_chain_state: 3,
            user_params: {
              fund_requirements: TEMPLATE_FUND_REQUIREMENTS,
            },
          },
        },
      },
    });

    await updateServiceIfNeeded(service, AgentMap.AgentsFun);
    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: {
        hash: TEMPLATE_HASH,
      },
    });

    // Verify chain_configs metadata is NOT in the update
    const updatePayload =
      mockUpdateService.mock.calls[0][0].partialServiceTemplate;
    expect(updatePayload).not.toHaveProperty('chain_configs');
    expect(updatePayload).not.toHaveProperty('service_public_id');
    expect(updatePayload).not.toHaveProperty('hash_history');
  });

  it('updates staking program when requested even with no other changes', async () => {
    const service = createService();

    await updateServiceIfNeeded(
      service,
      AgentMap.AgentsFun,
      'staking-program-v3' as StakingProgramId,
    );

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: {
        configurations: {
          [MiddlewareChainMap.BASE]: {
            staking_program_id: 'staking-program-v3',
          },
        },
      },
    });
  });

  it('merges staking program with existing fund_requirements in configurations', async () => {
    const service = createService({
      chain_configs: {
        [MiddlewareChainMap.BASE]: {
          chain_data: {
            user_params: {
              fund_requirements: {
                [AddressZero]: {
                  agent: '100000000000000',
                  safe: '500000000000000',
                },
              },
            },
          },
        },
      },
    });

    await updateServiceIfNeeded(
      service,
      AgentMap.AgentsFun,
      'staking-program-v3' as StakingProgramId,
    );

    expect(mockUpdateService).toHaveBeenCalledWith({
      serviceConfigId: SERVICE_CONFIG_ID,
      partialServiceTemplate: expect.objectContaining({
        configurations: {
          [MiddlewareChainMap.BASE]: {
            fund_requirements: TEMPLATE_FUND_REQUIREMENTS,
            staking_program_id: 'staking-program-v3',
          },
        },
      }),
    });
  });
});

describe('onDummyServiceCreation', () => {
  it('creates and deploys a service from template', async () => {
    const serviceTemplate = {
      name: 'dummy-template',
    } as unknown as ServiceTemplate;

    await onDummyServiceCreation(
      'staking-program-v1' as StakingProgramId,
      serviceTemplate,
    );

    expect(mockCreateService).toHaveBeenCalledTimes(1);
    expect(mockCreateService).toHaveBeenCalledWith({
      serviceTemplate,
      deploy: true,
      stakingProgramId: 'staking-program-v1',
    });
  });
});
