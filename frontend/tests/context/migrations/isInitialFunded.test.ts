import { AGENT_CONFIG } from '../../../config/agents';
import { AgentMap } from '../../../constants/agent';
import { migrateIsInitialFunded } from '../../../context/migrations/isInitialFunded';
import { MiddlewareServiceResponse } from '../../../types';
import { PearlStore } from '../../../types/ElectronApi';
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
  it('converts boolean true to per-service record and preserves legacy', () => {
    const service = serviceFor(AgentMap.PredictTrader);
    const storeState: PearlStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: true },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [service],
    });

    expect(writes).toEqual([
      {
        storeKey: `${AgentMap.PredictTrader}.isInitialFundedLegacy`,
        value: true,
      },
      {
        storeKey: `${AgentMap.PredictTrader}.isInitialFunded`,
        value: { [DEFAULT_SERVICE_CONFIG_ID]: true },
      },
    ]);
  });

  it('converts boolean false to per-service record and preserves legacy', () => {
    const service = serviceFor(AgentMap.PredictTrader);
    const storeState: PearlStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: false },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [service],
    });

    expect(writes).toEqual([
      {
        storeKey: `${AgentMap.PredictTrader}.isInitialFundedLegacy`,
        value: false,
      },
      {
        storeKey: `${AgentMap.PredictTrader}.isInitialFunded`,
        value: { [DEFAULT_SERVICE_CONFIG_ID]: false },
      },
    ]);
  });

  it('skips agent types already migrated (record value)', () => {
    const service = serviceFor(AgentMap.PredictTrader);
    const storeState: PearlStore = {
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
    const storeState: PearlStore = {};

    const writes = migrateIsInitialFunded({
      storeState,
      services: [service],
    });

    expect(writes).toEqual([]);
  });

  it('writes legacy + empty record when no matching service exists', () => {
    const optimusService = serviceFor(AgentMap.Optimus, {
      service_config_id: MOCK_SERVICE_CONFIG_ID_2,
    });
    const storeState: PearlStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: true },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [optimusService],
    });

    expect(writes).toEqual([
      {
        storeKey: `${AgentMap.PredictTrader}.isInitialFundedLegacy`,
        value: true,
      },
      {
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
    const storeState: PearlStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: true },
      [AgentMap.Optimus]: { isInitialFunded: false },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [traderService, optimusService],
    });

    // 2 writes per agent type (legacy + migrated)
    expect(writes).toHaveLength(4);
    expect(writes).toEqual(
      expect.arrayContaining([
        {
          storeKey: `${AgentMap.PredictTrader}.isInitialFundedLegacy`,
          value: true,
        },
        {
          storeKey: `${AgentMap.PredictTrader}.isInitialFunded`,
          value: { [DEFAULT_SERVICE_CONFIG_ID]: true },
        },
        {
          storeKey: `${AgentMap.Optimus}.isInitialFundedLegacy`,
          value: false,
        },
        {
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
    const storeState: PearlStore = {
      [AgentMap.PredictTrader]: { isInitialFunded: true },
      [AgentMap.Optimus]: {
        isInitialFunded: { [MOCK_SERVICE_CONFIG_ID_2]: true },
      },
    };

    const writes = migrateIsInitialFunded({
      storeState,
      services: [traderService, optimusService],
    });

    // Only trader needs migration (2 writes: legacy + migrated), optimus is already a record
    expect(writes).toHaveLength(2);
    expect(writes[0].storeKey).toBe(
      `${AgentMap.PredictTrader}.isInitialFundedLegacy`,
    );
    expect(writes[1].storeKey).toBe(
      `${AgentMap.PredictTrader}.isInitialFunded`,
    );
  });
});
