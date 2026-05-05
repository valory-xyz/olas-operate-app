import { AGENT_CONFIG } from '../../../config/agents';
import { AgentMap } from '../../../constants/agent';
import { resolveSelectedServiceConfigId } from '../../../context/migrations/serviceSelection';
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

describe('resolveSelectedServiceConfigId', () => {
  describe('current selection is valid', () => {
    it('keeps current selection when it exists in services', () => {
      const service = serviceFor(AgentMap.PredictTrader);
      const result = resolveSelectedServiceConfigId({
        services: [service],
        currentServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        hasMigrated: false,
      });

      expect(result.serviceConfigId).toBe(DEFAULT_SERVICE_CONFIG_ID);
      expect(result.shouldPersist).toBe(false);
      expect(result.migrated).toBe(false);
    });

    it('does not persist when current selection is valid', () => {
      const service = serviceFor(AgentMap.PredictTrader);
      const result = resolveSelectedServiceConfigId({
        services: [service],
        currentServiceConfigId: DEFAULT_SERVICE_CONFIG_ID,
        hasMigrated: true,
      });

      expect(result.shouldPersist).toBe(false);
    });
  });

  describe('migration from lastSelectedAgentType', () => {
    it('migrates to first matching service for legacy agent type', () => {
      const service = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const result = resolveSelectedServiceConfigId({
        services: [service],
        currentServiceConfigId: null,
        legacyAgentType: AgentMap.Optimus,
        hasMigrated: false,
      });

      expect(result.serviceConfigId).toBe(MOCK_SERVICE_CONFIG_ID_2);
      expect(result.shouldPersist).toBe(true);
      expect(result.migrated).toBe(true);
    });

    it('does not migrate if already migrated', () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      const optimusService = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const result = resolveSelectedServiceConfigId({
        services: [traderService, optimusService],
        currentServiceConfigId: null,
        legacyAgentType: AgentMap.Optimus,
        hasMigrated: true,
      });

      // Falls back to first service instead of migrating
      expect(result.serviceConfigId).toBe(DEFAULT_SERVICE_CONFIG_ID);
      expect(result.migrated).toBe(false);
    });

    it('falls back when legacy agent type has no matching service', () => {
      const traderService = serviceFor(AgentMap.PredictTrader);
      const result = resolveSelectedServiceConfigId({
        services: [traderService],
        currentServiceConfigId: null,
        legacyAgentType: AgentMap.Optimus,
        hasMigrated: false,
      });

      // No Optimus service, falls back to first available
      expect(result.serviceConfigId).toBe(DEFAULT_SERVICE_CONFIG_ID);
      expect(result.migrated).toBe(false);
    });
  });

  describe('fallback behavior', () => {
    it('selects first available service when no selection and no legacy type', () => {
      const service = serviceFor(AgentMap.PredictTrader);
      const result = resolveSelectedServiceConfigId({
        services: [service],
        currentServiceConfigId: null,
        hasMigrated: false,
      });

      expect(result.serviceConfigId).toBe(DEFAULT_SERVICE_CONFIG_ID);
      expect(result.shouldPersist).toBe(true);
      expect(result.migrated).toBe(false);
    });

    it('selects first service when current selection is invalid', () => {
      const service = serviceFor(AgentMap.PredictTrader);
      const result = resolveSelectedServiceConfigId({
        services: [service],
        currentServiceConfigId: 'sc-nonexistent',
        hasMigrated: true,
      });

      expect(result.serviceConfigId).toBe(DEFAULT_SERVICE_CONFIG_ID);
      expect(result.shouldPersist).toBe(true);
    });

    it('returns null when services list is empty', () => {
      const result = resolveSelectedServiceConfigId({
        services: [],
        currentServiceConfigId: null,
        hasMigrated: false,
      });

      expect(result.serviceConfigId).toBeNull();
      expect(result.shouldPersist).toBe(false);
    });

    it('picks the first service in order when multiple exist', () => {
      const first = serviceFor(AgentMap.Optimus, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      const second = serviceFor(AgentMap.AgentsFun, {
        service_config_id: MOCK_SERVICE_CONFIG_ID_3,
      });
      const result = resolveSelectedServiceConfigId({
        services: [first, second],
        currentServiceConfigId: null,
        hasMigrated: true,
      });

      expect(result.serviceConfigId).toBe(MOCK_SERVICE_CONFIG_ID_2);
    });
  });
});
