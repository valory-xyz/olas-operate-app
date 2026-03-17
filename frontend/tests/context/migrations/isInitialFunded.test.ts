import { AGENT_CONFIG } from '../../../config/agents';
import { AgentMap } from '../../../constants/agent';
import { migrateIsInitialFunded } from '../../../context/migrations/isInitialFunded';
import { ElectronStore, MiddlewareServiceResponse } from '../../../types';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAgentService,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({}));

const serviceFor = (
  agentType: keyof typeof AGENT_CONFIG = AgentMap.PredictTrader,
  overrides: Partial<MiddlewareServiceResponse> = {},
) => makeAgentService(AGENT_CONFIG[agentType], overrides);

describe('migrateIsInitialFunded', () => {
  it('converts boolean true to per-service record', () => {
    const service = serviceFor(AgentMap.PredictTrader);
    const storeState: ElectronStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: true },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [service],
    });

    expect(writes).toEqual([
      {
        agentType: AgentMap.PredictTrader,
        storeKey: `${AgentMap.PredictTrader}.isInitialFunded`,
        value: { [DEFAULT_SERVICE_CONFIG_ID]: true },
      },
    ]);
  });

  it('converts boolean false to per-service record', () => {
    const service = serviceFor(AgentMap.PredictTrader);
    const storeState: ElectronStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: false },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [service],
    });

    expect(writes).toEqual([
      {
        agentType: AgentMap.PredictTrader,
        storeKey: `${AgentMap.PredictTrader}.isInitialFunded`,
        value: { [DEFAULT_SERVICE_CONFIG_ID]: false },
      },
    ]);
  });

  it('skips agent types already migrated (record value)', () => {
    const service = serviceFor(AgentMap.PredictTrader);
    const storeState: ElectronStore = {
      [AgentMap.PredictTrader]: {
        isInitialFunded: { [DEFAULT_SERVICE_CONFIG_ID]: true },
      },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [service],
    });

    expect(writes).toEqual([]);
  });

  it('skips agent types with no settings in store', () => {
    const service = serviceFor(AgentMap.PredictTrader);
    const storeState: ElectronStore = {};

    const writes = migrateIsInitialFunded({
      storeState,
      services: [service],
    });

    expect(writes).toEqual([]);
  });

  it('writes empty record when no matching service exists', () => {
    // Store has trader settings but services only has optimus
    const optimusService = serviceFor(AgentMap.Optimus, {
      service_config_id: MOCK_SERVICE_CONFIG_ID_2,
    });
    const storeState: ElectronStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: true },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [optimusService],
    });

    expect(writes).toEqual([
      {
        agentType: AgentMap.PredictTrader,
        storeKey: `${AgentMap.PredictTrader}.isInitialFunded`,
        value: {},
      },
    ]);
  });

  it('migrates multiple agent types at once', () => {
    const traderService = serviceFor(AgentMap.PredictTrader);
    const optimusService = serviceFor(AgentMap.Optimus, {
      service_config_id: MOCK_SERVICE_CONFIG_ID_2,
    });
    const storeState: ElectronStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: true },
      [AgentMap.Optimus]: { isInitialFunded: false },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [traderService, optimusService],
    });

    expect(writes).toHaveLength(2);
    expect(writes).toEqual(
      expect.arrayContaining([
        {
          agentType: AgentMap.PredictTrader,
          storeKey: `${AgentMap.PredictTrader}.isInitialFunded`,
          value: { [DEFAULT_SERVICE_CONFIG_ID]: true },
        },
        {
          agentType: AgentMap.Optimus,
          storeKey: `${AgentMap.Optimus}.isInitialFunded`,
          value: { [MOCK_SERVICE_CONFIG_ID_2]: false },
        },
      ]),
    );
  });

  it('only migrates boolean values, leaves records untouched', () => {
    const traderService = serviceFor(AgentMap.PredictTrader);
    const optimusService = serviceFor(AgentMap.Optimus, {
      service_config_id: MOCK_SERVICE_CONFIG_ID_2,
    });
    const storeState: ElectronStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: true },
      [AgentMap.Optimus]: {
        isInitialFunded: { [MOCK_SERVICE_CONFIG_ID_2]: true },
      },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [traderService, optimusService],
    });

    // Only trader needs migration, optimus is already a record
    expect(writes).toHaveLength(1);
    expect(writes[0].agentType).toBe(AgentMap.PredictTrader);
  });
});
