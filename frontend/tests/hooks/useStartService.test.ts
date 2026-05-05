import { renderHook } from '@testing-library/react';

import { MechType } from '../../config/mechs';
import { AgentMap } from '../../constants/agent';
import { EvmChainIdMap } from '../../constants/chains';
import { useStartService } from '../../hooks/useStartService';
import { ServicesService } from '../../service/Services';
import { Service } from '../../types/Service';
import { updateServiceIfNeeded } from '../../utils/service';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  MOCK_SERVICE_CONFIG_ID_2,
  SECOND_STAKING_PROGRAM_ID,
  TRADER_SERVICE_HASH,
  TRADER_SERVICE_NAME,
} from '../helpers/factories';

jest.mock('../../service/Services', () => ({
  ServicesService: {
    startService: jest.fn(),
    createService: jest.fn(),
  },
}));

jest.mock('../../utils/service', () => ({
  updateServiceIfNeeded: jest.fn(),
}));
jest.mock('../../config/stakingPrograms', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const factories = require('../helpers/factories');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EvmChainIdMap: chains } = require('../../constants/chains');
  return {
    STAKING_PROGRAMS: {
      [chains.Gnosis]: {
        [factories.DEFAULT_STAKING_PROGRAM_ID]: {
          mechType: MechType.Marketplace,
        },
        [factories.SECOND_STAKING_PROGRAM_ID]: { mechType: MechType.Agent },
      },
    },
  };
});
jest.mock('../../constants/serviceTemplates', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const factories = require('../helpers/factories');
  return {
    SERVICE_TEMPLATES: [
      {
        agentType: AgentMap.PredictTrader,
        hash: factories.TRADER_SERVICE_HASH,
        name: factories.TRADER_SERVICE_NAME,
      },
      {
        agentType: AgentMap.Modius,
        hash: factories.MODIUS_SERVICE_HASH,
        name: factories.MODIUS_SERVICE_NAME,
      },
    ],
  };
});

const mockStartService = ServicesService.startService as jest.Mock;
const mockCreateService = ServicesService.createService as jest.Mock;

const mockUpdateServiceIfNeeded = updateServiceIfNeeded as jest.Mock;

const mockCreateSafeIfNeeded = jest.fn().mockResolvedValue(undefined);

const existingService = {
  service_config_id: DEFAULT_SERVICE_CONFIG_ID,
} as Service;

const baseInput = {
  agentType: AgentMap.PredictTrader,
  agentConfig: { evmHomeChainId: EvmChainIdMap.Gnosis },
  createSafeIfNeeded: mockCreateSafeIfNeeded,
} as unknown as Parameters<
  ReturnType<typeof useStartService>['startService']
>[0];

describe('useStartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartService.mockResolvedValue(undefined);
    mockCreateService.mockResolvedValue({
      service_config_id: MOCK_SERVICE_CONFIG_ID_2,
    });
    mockUpdateServiceIfNeeded.mockResolvedValue(undefined);
  });

  it('calls createSafeIfNeeded before anything else', async () => {
    const callOrder: string[] = [];
    mockCreateSafeIfNeeded.mockImplementation(() => {
      callOrder.push('createSafe');
      return Promise.resolve();
    });
    mockUpdateServiceIfNeeded.mockImplementation(() => {
      callOrder.push('updateService');
      return Promise.resolve();
    });
    mockStartService.mockImplementation(() => {
      callOrder.push('startService');
      return Promise.resolve();
    });

    const { result } = renderHook(() => useStartService());
    await result.current.startService({
      ...baseInput,
      service: existingService,
    });

    expect(callOrder[0]).toBe('createSafe');
  });

  describe('existing service path', () => {
    it('updates and starts the existing service', async () => {
      const { result } = renderHook(() => useStartService());
      const returned = await result.current.startService({
        ...baseInput,
        service: existingService,
      });

      expect(mockUpdateServiceIfNeeded).toHaveBeenCalledWith(
        existingService,
        AgentMap.PredictTrader,
      );
      expect(mockStartService).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
      expect(returned).toBe(existingService);
    });

    it('does not create a new service when one already exists', async () => {
      const { result } = renderHook(() => useStartService());
      await result.current.startService({
        ...baseInput,
        service: existingService,
      });

      expect(mockCreateService).not.toHaveBeenCalled();
    });
  });

  describe('no service path', () => {
    it('throws when createServiceIfMissing is false', async () => {
      const { result } = renderHook(() => useStartService());
      await expect(
        result.current.startService({
          ...baseInput,
          service: null,
          createServiceIfMissing: false,
        }),
      ).rejects.toThrow('Service not found for agent: trader');
    });

    it('throws when createServiceIfMissing is default (false)', async () => {
      const { result } = renderHook(() => useStartService());
      await expect(
        result.current.startService({
          ...baseInput,
          service: null,
        }),
      ).rejects.toThrow('Service not found for agent: trader');
    });

    it('throws when stakingProgramId is not provided', async () => {
      const { result } = renderHook(() => useStartService());
      await expect(
        result.current.startService({
          ...baseInput,
          service: null,
          createServiceIfMissing: true,
          stakingProgramId: undefined,
        }),
      ).rejects.toThrow('Staking program ID required for trader');
    });

    it('throws when service template is not found for the agent type', async () => {
      const { result } = renderHook(() => useStartService());
      await expect(
        result.current.startService({
          ...baseInput,
          agentType: 'unknown_agent' as typeof AgentMap.PredictTrader,
          service: null,
          createServiceIfMissing: true,
          stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        }),
      ).rejects.toThrow('Service template not found for unknown_agent');
    });

    it('throws when staking program is not found', async () => {
      const { result } = renderHook(() => useStartService());
      await expect(
        result.current.startService({
          ...baseInput,
          service: null,
          createServiceIfMissing: true,
          stakingProgramId: 'nonexistent-program' as Parameters<
            ReturnType<typeof useStartService>['startService']
          >[0]['stakingProgramId'],
        }),
      ).rejects.toThrow('Staking program not found for trader');
    });

    it('creates service with useMechMarketplace=true for Marketplace mechType', async () => {
      const { result } = renderHook(() => useStartService());
      await result.current.startService({
        ...baseInput,
        service: null,
        createServiceIfMissing: true,
        stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
      });

      expect(mockCreateService).toHaveBeenCalledWith(
        expect.objectContaining({ useMechMarketplace: true }),
      );
    });

    it('creates service with useMechMarketplace=false for Agent mechType', async () => {
      const { result } = renderHook(() => useStartService());
      await result.current.startService({
        ...baseInput,
        service: null,
        createServiceIfMissing: true,
        stakingProgramId: SECOND_STAKING_PROGRAM_ID,
      });

      expect(mockCreateService).toHaveBeenCalledWith(
        expect.objectContaining({ useMechMarketplace: false }),
      );
    });

    it('starts the created service and returns it', async () => {
      const createdService = { service_config_id: MOCK_SERVICE_CONFIG_ID_2 };
      mockCreateService.mockResolvedValue(createdService);

      const { result } = renderHook(() => useStartService());
      const returned = await result.current.startService({
        ...baseInput,
        service: null,
        createServiceIfMissing: true,
        stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
      });

      expect(mockStartService).toHaveBeenCalledWith(MOCK_SERVICE_CONFIG_ID_2);
      expect(returned).toBe(createdService);
    });

    it('passes correct fields to createService', async () => {
      const { result } = renderHook(() => useStartService());
      await result.current.startService({
        ...baseInput,
        service: null,
        createServiceIfMissing: true,
        stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
      });

      expect(mockCreateService).toHaveBeenCalledWith({
        stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        serviceTemplate: {
          agentType: AgentMap.PredictTrader,
          hash: TRADER_SERVICE_HASH,
          name: TRADER_SERVICE_NAME,
        },
        deploy: false,
        useMechMarketplace: true,
      });
    });
  });
});
