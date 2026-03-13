import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { MiddlewareDeploymentStatusMap } from '../../constants/deployment';
import { useBalanceContext } from '../../hooks/useBalanceContext';
import { useDeployability } from '../../hooks/useDeployability';
import { useElectronApi } from '../../hooks/useElectronApi';
import { useMultisigs } from '../../hooks/useMultisig';
import { usePageState } from '../../hooks/usePageState';
import { useService } from '../../hooks/useService';
import { useServiceDeployment } from '../../hooks/useServiceDeployment';
import { useServices } from '../../hooks/useServices';
import { useStakingContractContext } from '../../hooks/useStakingContractDetails';
import { useStakingProgram } from '../../hooks/useStakingProgram';
import { useStartService } from '../../hooks/useStartService';
import { useMasterWalletContext } from '../../hooks/useWallet';
import { WalletService } from '../../service/Wallet';
import {
  getSafeEligibility,
  getSafeEligibilityMessage,
} from '../../utils/safe';
import {
  BACKUP_SIGNER_ADDRESS,
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeMasterEoa,
  makeMasterSafe,
} from '../helpers/factories';

// --- mocks ---

jest.mock('antd', () => ({
  message: {
    error: jest.fn(),
    loading: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));
jest.mock('../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));
jest.mock('../../hooks/usePageState', () => ({ usePageState: jest.fn() }));
jest.mock('../../hooks/useWallet', () => ({
  useMasterWalletContext: jest.fn(),
}));
jest.mock('../../hooks/useServices', () => ({ useServices: jest.fn() }));
jest.mock('../../hooks/useService', () => ({ useService: jest.fn() }));
jest.mock('../../hooks/useBalanceContext', () => ({
  useBalanceContext: jest.fn(),
}));
jest.mock('../../hooks/useStakingContractDetails', () => ({
  useStakingContractContext: jest.fn(),
  useActiveStakingContractDetails: jest.fn().mockReturnValue({}),
}));
jest.mock('../../hooks/useStakingProgram', () => ({
  useStakingProgram: jest.fn(),
}));
jest.mock('../../hooks/useMultisig', () => ({ useMultisigs: jest.fn() }));
jest.mock('../../hooks/useStartService', () => ({
  useStartService: jest.fn(),
}));
jest.mock('../../hooks/useDeployability', () => ({
  useDeployability: jest.fn(),
}));
jest.mock('../../service/Wallet', () => ({
  WalletService: { createSafe: jest.fn() },
}));
jest.mock('../../utils/delay', () => ({
  delayInSeconds: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/safe', () => ({
  BACKUP_SIGNER_STATUS: {
    Ready: 'ready',
    HasSafe: 'has_safe',
    Loading: 'loading',
    MissingBackupSigner: 'missing_backup_signer',
    MultipleBackupSigners: 'multiple_backup_signers',
  },
  getSafeEligibility: jest.fn(),
  getSafeEligibilityMessage: jest.fn().mockReturnValue('Safe error message'),
}));

// hooks that useDeployability imports (need to be mocked since useDeployability is mocked)
jest.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatusContext: jest.fn().mockReturnValue({ isOnline: true }),
}));
jest.mock('../../hooks/useSharedContext', () => ({
  useSharedContext: jest
    .fn()
    .mockReturnValue({ isAgentsFunFieldUpdateRequired: false }),
}));
jest.mock('../../hooks/useAgentRunning', () => ({
  useAgentRunning: jest.fn().mockReturnValue({ isAnotherAgentRunning: false }),
}));
jest.mock('../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn().mockReturnValue({
    allowStartAgentByServiceConfigId: jest.fn().mockReturnValue(true),
    hasBalancesForServiceConfigId: jest.fn().mockReturnValue(true),
    isBalancesAndFundingRequirementsEnabledForAllServices: true,
    isBalancesAndFundingRequirementsLoadingForAllServices: false,
  }),
}));
jest.mock('../../hooks/useIsInitiallyFunded', () => ({
  useIsInitiallyFunded: jest.fn().mockReturnValue({ isInitialFunded: true }),
}));
jest.mock('../../hooks/useIsAgentGeoRestricted', () => ({
  useIsAgentGeoRestricted: jest.fn().mockReturnValue({
    isAgentGeoRestricted: false,
    isGeoLoading: false,
  }),
}));

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUsePageState = usePageState as jest.MockedFunction<
  typeof usePageState
>;
const mockUseMasterWalletContext =
  useMasterWalletContext as jest.MockedFunction<typeof useMasterWalletContext>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockUseBalanceContext = useBalanceContext as jest.MockedFunction<
  typeof useBalanceContext
>;
const mockUseStakingContractContext =
  useStakingContractContext as jest.MockedFunction<
    typeof useStakingContractContext
  >;
const mockUseStakingProgram = useStakingProgram as jest.MockedFunction<
  typeof useStakingProgram
>;
const mockUseMultisigs = useMultisigs as jest.MockedFunction<
  typeof useMultisigs
>;
const mockUseStartService = useStartService as jest.MockedFunction<
  typeof useStartService
>;
const mockUseDeployability = useDeployability as jest.MockedFunction<
  typeof useDeployability
>;
const mockGetSafeEligibility = getSafeEligibility as jest.Mock;
const mockGetSafeEligibilityMessage = getSafeEligibilityMessage as jest.Mock;
const mockCreateSafe = WalletService.createSafe as jest.Mock;

// --- defaults ---

const mockSetServicePollingPaused = jest.fn();
const mockRefetchServices = jest.fn().mockResolvedValue(undefined);
const mockOverrideStatus = jest.fn();
const mockSetBalancePaused = jest.fn();
const mockUpdateBalances = jest.fn().mockResolvedValue(undefined);
const mockSetStakingPaused = jest.fn();
const mockRefetchStaking = jest.fn().mockResolvedValue(undefined);
const mockShowNotification = jest.fn();
const mockGotoPage = jest.fn();
const mockStartServiceFn = jest.fn().mockResolvedValue(undefined);

const setupDefaults = () => {
  mockStartServiceFn.mockResolvedValue(undefined);
  mockRefetchServices.mockResolvedValue(undefined);
  mockUpdateBalances.mockResolvedValue(undefined);
  mockRefetchStaking.mockResolvedValue(undefined);
  mockUseElectronApi.mockReturnValue({
    showNotification: mockShowNotification,
  } as ReturnType<typeof useElectronApi>);
  mockUsePageState.mockReturnValue({
    goto: mockGotoPage,
  } as unknown as ReturnType<typeof usePageState>);
  mockUseMasterWalletContext.mockReturnValue({
    masterWallets: [makeMasterEoa()],
    masterSafes: [makeMasterSafe(100)],
    masterEoa: makeMasterEoa(),
  } as unknown as ReturnType<typeof useMasterWalletContext>);
  mockUseServices.mockReturnValue({
    selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    setPaused: mockSetServicePollingPaused,
    refetch: mockRefetchServices,
    isLoading: false,
    selectedAgentConfig: {
      evmHomeChainId: 100,
      middlewareHomeChainId: 'gnosis',
    },
    selectedAgentType: 'trader',
    overrideSelectedServiceStatus: mockOverrideStatus,
  } as unknown as ReturnType<typeof useServices>);
  mockUseService.mockReturnValue({
    service: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    isServiceRunning: false,
  } as ReturnType<typeof useService>);
  mockUseBalanceContext.mockReturnValue({
    setIsPaused: mockSetBalancePaused,
    updateBalances: mockUpdateBalances,
  } as unknown as ReturnType<typeof useBalanceContext>);
  mockUseStakingContractContext.mockReturnValue({
    isAllStakingContractDetailsRecordLoaded: true,
    setIsPaused: mockSetStakingPaused,
    refetchSelectedStakingContractDetails: mockRefetchStaking,
  } as unknown as ReturnType<typeof useStakingContractContext>);
  mockUseStakingProgram.mockReturnValue({
    selectedStakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
  } as unknown as ReturnType<typeof useStakingProgram>);
  mockUseMultisigs.mockReturnValue({
    masterSafesOwners: [],
  } as unknown as ReturnType<typeof useMultisigs>);
  mockUseStartService.mockReturnValue({
    startService: mockStartServiceFn,
  });
  mockUseDeployability.mockReturnValue({
    canRun: true,
    isLoading: false,
  });
};

// --- tests ---

describe('useServiceDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaults();
  });

  describe('isLoading', () => {
    it('returns true when services are loading', () => {
      mockUseServices.mockReturnValue({
        ...mockUseServices(),
        isLoading: true,
      } as unknown as ReturnType<typeof useServices>);
      const { result } = renderHook(() => useServiceDeployment());
      expect(result.current.isLoading).toBe(true);
    });

    it('returns true when service is running', () => {
      mockUseService.mockReturnValue({
        service: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
        isServiceRunning: true,
      } as ReturnType<typeof useService>);
      const { result } = renderHook(() => useServiceDeployment());
      expect(result.current.isLoading).toBe(true);
    });

    it('returns true when staking details not loaded', () => {
      mockUseStakingContractContext.mockReturnValue({
        ...mockUseStakingContractContext(),
        isAllStakingContractDetailsRecordLoaded: false,
      } as unknown as ReturnType<typeof useStakingContractContext>);
      const { result } = renderHook(() => useServiceDeployment());
      expect(result.current.isLoading).toBe(true);
    });

    it('returns false when all data is loaded and service not running', () => {
      const { result } = renderHook(() => useServiceDeployment());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('isDeployable', () => {
    it('returns true when canRun=true and not loading', () => {
      const { result } = renderHook(() => useServiceDeployment());
      expect(result.current.isDeployable).toBe(true);
    });

    it('returns false when canRun=true but loading', () => {
      mockUseService.mockReturnValue({
        service: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
        isServiceRunning: true,
      } as ReturnType<typeof useService>);
      const { result } = renderHook(() => useServiceDeployment());
      expect(result.current.isDeployable).toBe(false);
    });

    it('returns false when canRun=false', () => {
      mockUseDeployability.mockReturnValue({
        canRun: false,
        isLoading: false,
        reason: 'Low balance',
      });
      const { result } = renderHook(() => useServiceDeployment());
      expect(result.current.isDeployable).toBe(false);
    });
  });

  describe('handleStart', () => {
    it('returns early when no masterWallets', async () => {
      mockUseMasterWalletContext.mockReturnValue({
        masterWallets: [],
        masterSafes: [],
        masterEoa: undefined,
      } as unknown as ReturnType<typeof useMasterWalletContext>);

      const { result } = renderHook(() => useServiceDeployment());
      await act(async () => {
        await result.current.handleStart();
      });

      expect(mockStartServiceFn).not.toHaveBeenCalled();
    });

    it('throws when no staking program ID selected', async () => {
      mockUseStakingProgram.mockReturnValue({
        selectedStakingProgramId: null,
      } as unknown as ReturnType<typeof useStakingProgram>);

      const { result } = renderHook(() => useServiceDeployment());
      await expect(
        act(async () => {
          await result.current.handleStart();
        }),
      ).rejects.toThrow('Staking program ID required');
    });

    it('pauses all polling before starting', async () => {
      const { result } = renderHook(() => useServiceDeployment());
      await act(async () => {
        await result.current.handleStart();
      });

      expect(mockSetServicePollingPaused).toHaveBeenCalledWith(true);
      expect(mockSetBalancePaused).toHaveBeenCalledWith(true);
      expect(mockSetStakingPaused).toHaveBeenCalledWith(true);
    });

    it('overrides status to DEPLOYING before start', async () => {
      const { result } = renderHook(() => useServiceDeployment());
      await act(async () => {
        await result.current.handleStart();
      });

      expect(mockOverrideStatus).toHaveBeenCalledWith(
        MiddlewareDeploymentStatusMap.DEPLOYING,
      );
    });

    it('calls startService with correct parameters', async () => {
      const { result } = renderHook(() => useServiceDeployment());
      await act(async () => {
        await result.current.handleStart();
      });

      expect(mockStartServiceFn).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: 'trader',
          stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
          createServiceIfMissing: true,
        }),
      );
    });

    it('updates states sequentially after successful start', async () => {
      const callOrder: string[] = [];
      mockRefetchServices.mockImplementation(() => {
        callOrder.push('services');
        return Promise.resolve();
      });
      mockRefetchStaking.mockImplementation(() => {
        callOrder.push('staking');
        return Promise.resolve();
      });
      mockUpdateBalances.mockImplementation(() => {
        callOrder.push('balances');
        return Promise.resolve();
      });

      const { result } = renderHook(() => useServiceDeployment());
      await act(async () => {
        await result.current.handleStart();
      });

      expect(callOrder).toEqual(['services', 'staking', 'balances']);
    });

    it('overrides status to DEPLOYED and then null after delay', async () => {
      const { result } = renderHook(() => useServiceDeployment());
      await act(async () => {
        await result.current.handleStart();
      });

      // DEPLOYING → DEPLOYED → null
      expect(mockOverrideStatus).toHaveBeenCalledWith(
        MiddlewareDeploymentStatusMap.DEPLOYING,
      );
      expect(mockOverrideStatus).toHaveBeenCalledWith(
        MiddlewareDeploymentStatusMap.DEPLOYED,
      );
      expect(mockOverrideStatus).toHaveBeenCalledWith(null);
    });

    it('resumes polling after successful start', async () => {
      const { result } = renderHook(() => useServiceDeployment());
      await act(async () => {
        await result.current.handleStart();
      });

      expect(mockSetServicePollingPaused).toHaveBeenCalledWith(false);
      expect(mockSetBalancePaused).toHaveBeenCalledWith(false);
      expect(mockSetStakingPaused).toHaveBeenCalledWith(false);
    });

    describe('start error handling', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('shows notification and resets status on start failure', async () => {
        mockStartServiceFn.mockRejectedValue(new Error('Start failed'));

        const { result } = renderHook(() => useServiceDeployment());
        await expect(
          act(async () => {
            await result.current.handleStart();
          }),
        ).rejects.toThrow('Start failed');

        expect(mockShowNotification).toHaveBeenCalledWith(
          'An error occurred while starting. Please try again.',
        );
        expect(mockOverrideStatus).toHaveBeenCalledWith(null);
      });

      it('resumes polling on start failure', async () => {
        mockStartServiceFn.mockRejectedValue(new Error('Start failed'));

        const { result } = renderHook(() => useServiceDeployment());
        await expect(
          act(async () => {
            await result.current.handleStart();
          }),
        ).rejects.toThrow();

        expect(mockSetServicePollingPaused).toHaveBeenCalledWith(false);
        expect(mockSetBalancePaused).toHaveBeenCalledWith(false);
        expect(mockSetStakingPaused).toHaveBeenCalledWith(false);
      });

      it('rethrows the start error', async () => {
        const error = new Error('Start failed');
        mockStartServiceFn.mockRejectedValue(error);

        const { result } = renderHook(() => useServiceDeployment());
        await expect(
          act(async () => {
            await result.current.handleStart();
          }),
        ).rejects.toThrow('Start failed');
      });
    });

    describe('state update error handling', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('shows notification but does not throw on state update failure', async () => {
        mockRefetchServices.mockRejectedValue(new Error('Refetch failed'));

        const { result } = renderHook(() => useServiceDeployment());
        // Should not reject
        await act(async () => {
          await result.current.handleStart();
        });

        expect(mockShowNotification).toHaveBeenCalledWith(
          'Failed to update state.',
        );
      });

      it('still overrides status to DEPLOYED after state update failure', async () => {
        mockRefetchServices.mockRejectedValue(new Error('Refetch failed'));

        const { result } = renderHook(() => useServiceDeployment());
        await act(async () => {
          await result.current.handleStart();
        });

        expect(mockOverrideStatus).toHaveBeenCalledWith(
          MiddlewareDeploymentStatusMap.DEPLOYED,
        );
        expect(mockOverrideStatus).toHaveBeenCalledWith(null);
      });
    });

    describe('createSafeIfNeeded callback', () => {
      // To exercise the createSafeIfNeeded closure, we intercept the
      // startService call, extract the callback, and invoke it directly.
      const extractCreateSafeCallback = async () => {
        const { result } = renderHook(() => useServiceDeployment());
        await act(async () => {
          await result.current.handleStart();
        });
        const createSafeIfNeeded =
          mockStartServiceFn.mock.calls[0][0].createSafeIfNeeded;
        return createSafeIfNeeded as () => Promise<void>;
      };

      it('returns early when user already has a safe (HasSafe status)', async () => {
        mockGetSafeEligibility.mockReturnValue({
          status: 'has_safe',
          canProceed: true,
          shouldCreateSafe: false,
        });

        const createSafe = await extractCreateSafeCallback();
        await createSafe();

        expect(mockCreateSafe).not.toHaveBeenCalled();
      });

      it('creates safe with backup owner when eligibility is Ready', async () => {
        mockGetSafeEligibility.mockReturnValue({
          status: 'ready',
          canProceed: true,
          shouldCreateSafe: true,
          backupOwner: BACKUP_SIGNER_ADDRESS,
        });
        mockCreateSafe.mockResolvedValue(undefined);

        const createSafe = await extractCreateSafeCallback();
        await createSafe();

        expect(mockCreateSafe).toHaveBeenCalledWith(
          'gnosis',
          BACKUP_SIGNER_ADDRESS,
        );
      });

      it('shows error, redirects to Settings, and throws when canProceed is false', async () => {
        mockGetSafeEligibility.mockReturnValue({
          status: 'missing_backup_signer',
          canProceed: false,
          shouldCreateSafe: false,
        });

        const createSafe = await extractCreateSafeCallback();
        await expect(createSafe()).rejects.toThrow('Safe eligibility failed');

        expect(mockGetSafeEligibilityMessage).toHaveBeenCalledWith(
          'missing_backup_signer',
        );
        expect(mockGotoPage).toHaveBeenCalled();
      });

      it('throws when backupOwner is missing even if canProceed and shouldCreateSafe', async () => {
        mockGetSafeEligibility.mockReturnValue({
          status: 'ready',
          canProceed: true,
          shouldCreateSafe: true,
          backupOwner: undefined,
        });

        const createSafe = await extractCreateSafeCallback();
        await expect(createSafe()).rejects.toThrow('Safe eligibility failed');
      });
    });
  });
});
