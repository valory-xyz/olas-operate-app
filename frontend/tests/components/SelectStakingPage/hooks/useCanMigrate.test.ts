import { renderHook } from '@testing-library/react';

import {
  MigrateButtonText,
  useCanMigrate,
} from '../../../../components/SelectStakingPage/hooks/useCanMigrate';
import type { MiddlewareDeploymentStatus } from '../../../../constants/deployment';
import { MiddlewareDeploymentStatusMap } from '../../../../constants/deployment';
import { useService } from '../../../../hooks/useService';
import { useServices } from '../../../../hooks/useServices';
import {
  useActiveStakingContractDetails,
  useStakingContractContext,
} from '../../../../hooks/useStakingContractDetails';
import type { StakingContractDetails } from '../../../../types/Autonolas';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeService,
  makeStakingContractDetails,
} from '../../../helpers/factories';

jest.mock('../../../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../../../hooks/useService', () => ({
  useService: jest.fn(),
}));
jest.mock('../../../../hooks/useStakingContractDetails', () => ({
  useStakingContractContext: jest.fn(),
  useActiveStakingContractDetails: jest.fn(),
}));

const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockUseStakingContractContext =
  useStakingContractContext as jest.MockedFunction<
    typeof useStakingContractContext
  >;
const mockUseActiveStakingContractDetails =
  useActiveStakingContractDetails as jest.MockedFunction<
    typeof useActiveStakingContractDetails
  >;

type SetupOptions = {
  isCurrentStakingProgram?: boolean;
  deploymentStatus?: MiddlewareDeploymentStatus;
  serviceNftTokenId?: number;
  isServiceStakedForMinimumDuration?: boolean;
  contractDetails?: Partial<StakingContractDetails> | null;
  hasSelectedService?: boolean;
};

const setupMocks = ({
  isCurrentStakingProgram = false,
  deploymentStatus = MiddlewareDeploymentStatusMap.STOPPED,
  serviceNftTokenId = DEFAULT_SERVICE_NFT_TOKEN_ID,
  isServiceStakedForMinimumDuration = true,
  contractDetails = makeStakingContractDetails(),
  hasSelectedService = true,
}: SetupOptions = {}) => {
  mockUseServices.mockReturnValue({
    selectedService: hasSelectedService
      ? makeService({ service_config_id: DEFAULT_SERVICE_CONFIG_ID })
      : undefined,
  } as ReturnType<typeof useServices>);

  mockUseService.mockReturnValue({
    deploymentStatus,
    serviceNftTokenId,
  } as ReturnType<typeof useService>);

  mockUseStakingContractContext.mockReturnValue({
    allStakingContractDetailsRecord: contractDetails
      ? ({ [DEFAULT_STAKING_PROGRAM_ID]: contractDetails } as Record<
          string,
          Partial<StakingContractDetails>
        >)
      : undefined,
  } as ReturnType<typeof useStakingContractContext>);

  mockUseActiveStakingContractDetails.mockReturnValue({
    isServiceStakedForMinimumDuration,
  } as ReturnType<typeof useActiveStakingContractDetails>);

  return { isCurrentStakingProgram };
};

const renderUseCanMigrate = (isCurrentStakingProgram: boolean) =>
  renderHook(() =>
    useCanMigrate({
      stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
      isCurrentStakingProgram,
    }),
  );

describe('useCanMigrate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCurrentStakingProgram = true', () => {
    it('returns "Selected" with canMigrate false', () => {
      const { isCurrentStakingProgram } = setupMocks({
        isCurrentStakingProgram: true,
      });
      const { result } = renderUseCanMigrate(isCurrentStakingProgram);
      expect(result.current.buttonText).toBe(MigrateButtonText.CurrentContract);
      expect(result.current.canMigrate).toBe(false);
    });

    it('takes priority over service running', () => {
      const { isCurrentStakingProgram } = setupMocks({
        isCurrentStakingProgram: true,
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      });
      const { result } = renderUseCanMigrate(isCurrentStakingProgram);
      expect(result.current.buttonText).toBe(MigrateButtonText.CurrentContract);
      expect(result.current.canMigrate).toBe(false);
    });
  });

  describe('service is running (active deployment status)', () => {
    it.each([
      ['DEPLOYED', MiddlewareDeploymentStatusMap.DEPLOYED],
      ['DEPLOYING', MiddlewareDeploymentStatusMap.DEPLOYING],
      ['STOPPING', MiddlewareDeploymentStatusMap.STOPPING],
    ] as const)(
      'returns "Agent is currently running" when status is %s',
      (_label, status) => {
        setupMocks({ deploymentStatus: status });
        const { result } = renderUseCanMigrate(false);
        expect(result.current.buttonText).toBe(
          MigrateButtonText.CurrentlyRunning,
        );
        expect(result.current.canMigrate).toBe(false);
      },
    );
  });

  describe('cooldown period', () => {
    it('returns "Agent in cooldown period" when not staked for minimum duration and service ID is valid', () => {
      setupMocks({
        isServiceStakedForMinimumDuration: false,
        serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      });
      const { result } = renderUseCanMigrate(false);
      expect(result.current.buttonText).toBe(
        MigrateButtonText.AgentInCooldownPeriod,
      );
      expect(result.current.canMigrate).toBe(false);
    });

    it('skips cooldown when serviceNftTokenId is 0 (invalid)', () => {
      setupMocks({
        isServiceStakedForMinimumDuration: false,
        serviceNftTokenId: 0,
        contractDetails: makeStakingContractDetails({
          maxNumServices: 10,
          serviceIds: [],
        }),
      });
      const { result } = renderUseCanMigrate(false);
      // serviceNftTokenId=0 is invalid, so cooldown branch is skipped -> default
      expect(result.current.buttonText).toBe(MigrateButtonText.SelectContract);
      expect(result.current.canMigrate).toBe(true);
    });

    it('skips cooldown when serviceNftTokenId is -1 (invalid)', () => {
      setupMocks({
        isServiceStakedForMinimumDuration: false,
        serviceNftTokenId: -1,
        contractDetails: makeStakingContractDetails({
          maxNumServices: 10,
          serviceIds: [],
        }),
      });
      const { result } = renderUseCanMigrate(false);
      expect(result.current.buttonText).toBe(MigrateButtonText.SelectContract);
      expect(result.current.canMigrate).toBe(true);
    });

    it('skips cooldown when isServiceStakedForMinimumDuration is true', () => {
      setupMocks({
        isServiceStakedForMinimumDuration: true,
        serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
        contractDetails: makeStakingContractDetails({
          maxNumServices: 10,
          serviceIds: [],
        }),
      });
      const { result } = renderUseCanMigrate(false);
      // staked for min duration = true, so !true = false -> cooldown branch skipped
      expect(result.current.buttonText).toBe(MigrateButtonText.SelectContract);
      expect(result.current.canMigrate).toBe(true);
    });
  });

  describe('no slots available', () => {
    it('returns "No slots available" when slotsTaken >= maxSlots', () => {
      setupMocks({
        contractDetails: makeStakingContractDetails({
          maxNumServices: 2,
          serviceIds: [1, 2],
        }),
      });
      const { result } = renderUseCanMigrate(false);
      expect(result.current.buttonText).toBe(
        MigrateButtonText.NoSlotsAvailable,
      );
      expect(result.current.canMigrate).toBe(false);
    });

    it('returns "No slots available" when slotsTaken > maxSlots', () => {
      setupMocks({
        contractDetails: makeStakingContractDetails({
          maxNumServices: 1,
          serviceIds: [1, 2, 3],
        }),
      });
      const { result } = renderUseCanMigrate(false);
      expect(result.current.buttonText).toBe(
        MigrateButtonText.NoSlotsAvailable,
      );
      expect(result.current.canMigrate).toBe(false);
    });

    it('returns "No slots available" when allStakingContractDetailsRecord is undefined (0 >= 0)', () => {
      setupMocks({ contractDetails: null });
      const { result } = renderUseCanMigrate(false);
      // contractDetails is null => maxSlots=0, slotsTaken=0 => 0>=0 => true
      expect(result.current.buttonText).toBe(
        MigrateButtonText.NoSlotsAvailable,
      );
      expect(result.current.canMigrate).toBe(false);
    });
  });

  describe('default (can migrate)', () => {
    it('returns "Select" with canMigrate true when all conditions pass', () => {
      setupMocks({
        contractDetails: makeStakingContractDetails({
          maxNumServices: 10,
          serviceIds: [1],
        }),
      });
      const { result } = renderUseCanMigrate(false);
      expect(result.current.buttonText).toBe(MigrateButtonText.SelectContract);
      expect(result.current.canMigrate).toBe(true);
    });

    it('returns "Select" when service is stopped and slots available', () => {
      setupMocks({
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
        contractDetails: makeStakingContractDetails({
          maxNumServices: 5,
          serviceIds: [],
        }),
      });
      const { result } = renderUseCanMigrate(false);
      expect(result.current.buttonText).toBe(MigrateButtonText.SelectContract);
      expect(result.current.canMigrate).toBe(true);
    });
  });

  describe('useService receives correct serviceConfigId', () => {
    it('passes selectedService.service_config_id to useService', () => {
      setupMocks({ hasSelectedService: true });
      renderUseCanMigrate(false);
      expect(mockUseService).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
    });

    it('passes undefined when selectedService is missing', () => {
      setupMocks({ hasSelectedService: false });
      renderUseCanMigrate(false);
      expect(mockUseService).toHaveBeenCalledWith(undefined);
    });
  });

  describe('branch priority order', () => {
    it('isCurrentStakingProgram takes priority over cooldown and no slots', () => {
      const { isCurrentStakingProgram } = setupMocks({
        isCurrentStakingProgram: true,
        isServiceStakedForMinimumDuration: false,
        serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
        contractDetails: makeStakingContractDetails({
          maxNumServices: 0,
          serviceIds: [1],
        }),
      });
      const { result } = renderUseCanMigrate(isCurrentStakingProgram);
      expect(result.current.buttonText).toBe(MigrateButtonText.CurrentContract);
    });

    it('service running takes priority over cooldown', () => {
      setupMocks({
        deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
        isServiceStakedForMinimumDuration: false,
        serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
      });
      const { result } = renderUseCanMigrate(false);
      expect(result.current.buttonText).toBe(
        MigrateButtonText.CurrentlyRunning,
      );
    });

    it('cooldown takes priority over no slots', () => {
      setupMocks({
        isServiceStakedForMinimumDuration: false,
        serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
        contractDetails: makeStakingContractDetails({
          maxNumServices: 0,
          serviceIds: [1],
        }),
      });
      const { result } = renderUseCanMigrate(false);
      expect(result.current.buttonText).toBe(
        MigrateButtonText.AgentInCooldownPeriod,
      );
    });
  });

  describe('inactive deployment statuses do not trigger running branch', () => {
    it.each([
      ['CREATED', MiddlewareDeploymentStatusMap.CREATED],
      ['BUILT', MiddlewareDeploymentStatusMap.BUILT],
      ['STOPPED', MiddlewareDeploymentStatusMap.STOPPED],
      ['DELETED', MiddlewareDeploymentStatusMap.DELETED],
    ] as const)(
      'status %s does not trigger "Agent is currently running"',
      (_label, status) => {
        setupMocks({
          deploymentStatus: status,
          contractDetails: makeStakingContractDetails({
            maxNumServices: 10,
            serviceIds: [],
          }),
        });
        const { result } = renderUseCanMigrate(false);
        expect(result.current.buttonText).not.toBe(
          MigrateButtonText.CurrentlyRunning,
        );
      },
    );
  });
});
