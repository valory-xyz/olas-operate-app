import { AGENT_CONFIG } from '../../../config/agents';
import { AgentMap, AgentType } from '../../../constants/agent';
import { prepateAutoRunInstancesForMigration } from '../../../context/migrations/autoRunInstances';
import { MiddlewareServiceResponse } from '../../../types';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  makeAgentService,
  MOCK_SERVICE_CONFIG_ID_2,
  MOCK_SERVICE_CONFIG_ID_3,
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

const makeGetInstances =
  (map: Partial<Record<AgentType, MiddlewareServiceResponse[]>>) =>
  (agentType: AgentType) =>
    map[agentType] ?? [];

describe('prepateAutoRunInstancesForMigration', () => {
  describe('no old data', () => {
    it('returns didMigrate false when autoRun is empty', () => {
      const result = prepateAutoRunInstancesForMigration(
        {},
        makeGetInstances({}),
      );
      expect(result.didMigrate).toBe(false);
      expect(result.includedInstances).toEqual([]);
      expect(result.userExcludedInstances).toEqual([]);
    });

    it('returns didMigrate false when old fields are undefined', () => {
      const result = prepateAutoRunInstancesForMigration(
        { includedAgents: undefined, userExcludedAgents: undefined },
        makeGetInstances({}),
      );
      expect(result.didMigrate).toBe(false);
    });

    it('returns didMigrate false when old fields are empty arrays', () => {
      const result = prepateAutoRunInstancesForMigration(
        { includedAgents: [], userExcludedAgents: [] },
        makeGetInstances({}),
      );
      expect(result.didMigrate).toBe(false);
    });

    it('preserves existing instances when no old data', () => {
      const existing = [
        { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
      ];
      const result = prepateAutoRunInstancesForMigration(
        { includedAgentInstances: existing },
        makeGetInstances({}),
      );
      expect(result.didMigrate).toBe(false);
      expect(result.includedInstances).toEqual(existing);
    });

    it('preserves existing excluded instances when no old data', () => {
      const excluded = [DEFAULT_SERVICE_CONFIG_ID];
      const result = prepateAutoRunInstancesForMigration(
        { userExcludedAgentInstances: excluded },
        makeGetInstances({}),
      );
      expect(result.didMigrate).toBe(false);
      expect(result.userExcludedInstances).toEqual(excluded);
    });
  });

  describe('migrate includedAgents', () => {
    it('converts old includedAgents to includedAgentInstances', () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      const result = prepateAutoRunInstancesForMigration(
        {
          includedAgents: [{ agentType: AgentMap.PredictTrader, order: 0 }],
        },
        makeGetInstances({
          [AgentMap.PredictTrader]: [traderService],
        }),
      );

      expect(result.didMigrate).toBe(true);
      expect(result.includedInstances).toEqual([
        { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
      ]);
    });

    it('maps multiple instances of the same agent type', () => {
      const service1 = serviceFor(AgentMap.PredictTrader);
      const service2 = serviceFor(AgentMap.PredictTrader, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const result = prepateAutoRunInstancesForMigration(
        {
          includedAgents: [{ agentType: AgentMap.PredictTrader, order: 1 }],
        },
        makeGetInstances({
          [AgentMap.PredictTrader]: [service1, service2],
        }),
      );

      expect(result.didMigrate).toBe(true);
      expect(result.includedInstances).toHaveLength(2);
      expect(result.includedInstances).toEqual([
        { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 1 },
        { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 1 },
      ]);
    });

    it('deduplicates instances across agent types', () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      const result = prepateAutoRunInstancesForMigration(
        {
          includedAgents: [
            { agentType: AgentMap.PredictTrader, order: 0 },
            { agentType: AgentMap.PredictTrader, order: 1 },
          ],
        },
        makeGetInstances({
          [AgentMap.PredictTrader]: [traderService],
        }),
      );

      expect(result.includedInstances).toHaveLength(1);
      expect(result.includedInstances[0].serviceConfigId).toBe(
        DEFAULT_SERVICE_CONFIG_ID,
      );
    });
  });

  describe('migrate userExcludedAgents', () => {
    it('converts old userExcludedAgents to userExcludedAgentInstances', () => {
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const result = prepateAutoRunInstancesForMigration(
        {
          userExcludedAgents: [AgentMap.Optimus],
        },
        makeGetInstances({
          [AgentMap.Optimus]: [optimusService],
        }),
      );

      expect(result.didMigrate).toBe(true);
      expect(result.userExcludedInstances).toEqual([MOCK_SERVICE_CONFIG_ID_2]);
    });

    it('maps multiple instances for excluded agent type', () => {
      const service1 = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const service2 = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_3,
      });
      const result = prepateAutoRunInstancesForMigration(
        {
          userExcludedAgents: [AgentMap.Optimus],
        },
        makeGetInstances({
          [AgentMap.Optimus]: [service1, service2],
        }),
      );

      expect(result.didMigrate).toBe(true);
      expect(result.userExcludedInstances).toEqual([
        MOCK_SERVICE_CONFIG_ID_2,
        MOCK_SERVICE_CONFIG_ID_3,
      ]);
    });

    it('deduplicates excluded instances', () => {
      const service = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const result = prepateAutoRunInstancesForMigration(
        {
          userExcludedAgents: [AgentMap.Optimus, AgentMap.Optimus],
        },
        makeGetInstances({
          [AgentMap.Optimus]: [service],
        }),
      );

      expect(result.userExcludedInstances).toHaveLength(1);
    });
  });

  describe('both old fields present', () => {
    it('migrates both includedAgents and userExcludedAgents', () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const result = prepateAutoRunInstancesForMigration(
        {
          includedAgents: [{ agentType: AgentMap.PredictTrader, order: 0 }],
          userExcludedAgents: [AgentMap.Optimus],
        },
        makeGetInstances({
          [AgentMap.PredictTrader]: [traderService],
          [AgentMap.Optimus]: [optimusService],
        }),
      );

      expect(result.didMigrate).toBe(true);
      expect(result.includedInstances).toEqual([
        { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
      ]);
      expect(result.userExcludedInstances).toEqual([MOCK_SERVICE_CONFIG_ID_2]);
    });
  });

  describe('already migrated', () => {
    it('returns didMigrate false when old fields are empty and new fields exist', () => {
      const existing = [
        { serviceConfigId: DEFAULT_SERVICE_CONFIG_ID, order: 0 },
      ];
      const result = prepateAutoRunInstancesForMigration(
        {
          includedAgents: [],
          userExcludedAgents: [],
          includedAgentInstances: existing,
          userExcludedAgentInstances: [MOCK_SERVICE_CONFIG_ID_2],
        },
        makeGetInstances({}),
      );

      expect(result.didMigrate).toBe(false);
      expect(result.includedInstances).toEqual(existing);
      expect(result.userExcludedInstances).toEqual([MOCK_SERVICE_CONFIG_ID_2]);
    });
  });

  describe('edge cases', () => {
    it('handles agent type with no instances gracefully', () => {
      const result = prepateAutoRunInstancesForMigration(
        {
          includedAgents: [{ agentType: AgentMap.PredictTrader, order: 0 }],
        },
        makeGetInstances({}),
      );

      expect(result.didMigrate).toBe(true);
      expect(result.includedInstances).toEqual([]);
    });

    it('falls back to existing instances when migration produces empty included list', () => {
      const existing = [
        { serviceConfigId: MOCK_SERVICE_CONFIG_ID_2, order: 1 },
      ];
      const result = prepateAutoRunInstancesForMigration(
        {
          includedAgents: [{ agentType: AgentMap.PredictTrader, order: 0 }],
          includedAgentInstances: existing,
        },
        makeGetInstances({}),
      );

      expect(result.didMigrate).toBe(true);
      expect(result.includedInstances).toEqual(existing);
    });
  });
});
