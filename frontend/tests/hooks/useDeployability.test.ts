import { renderHook } from '@testing-library/react';

import { ELIGIBILITY_REASON } from '../../context/AutoRunProvider/constants';
import { useAgentRunning } from '../../hooks/useAgentRunning';
import { useBalanceAndRefillRequirementsContext } from '../../hooks/useBalanceAndRefillRequirementsContext';
import { useDeployability } from '../../hooks/useDeployability';
import { useIsAgentGeoRestricted } from '../../hooks/useIsAgentGeoRestricted';
import { useIsInitiallyFunded } from '../../hooks/useIsInitiallyFunded';
import { useOnlineStatusContext } from '../../hooks/useOnlineStatus';
import { useServices } from '../../hooks/useServices';
import { useSharedContext } from '../../hooks/useSharedContext';
import { useActiveStakingContractDetails } from '../../hooks/useStakingContractDetails';
import { DEFAULT_SERVICE_CONFIG_ID } from '../helpers/factories';

// --- mocks ---

jest.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatusContext: jest.fn(),
}));
jest.mock('../../hooks/useSharedContext', () => ({
  useSharedContext: jest.fn(),
}));
jest.mock('../../hooks/useAgentRunning', () => ({
  useAgentRunning: jest.fn(),
}));
jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../hooks/useBalanceAndRefillRequirementsContext', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
}));
jest.mock('../../hooks/useStakingContractDetails', () => ({
  useActiveStakingContractDetails: jest.fn(),
}));
jest.mock('../../hooks/useIsInitiallyFunded', () => ({
  useIsInitiallyFunded: jest.fn(),
}));
jest.mock('../../hooks/useIsAgentGeoRestricted', () => ({
  useIsAgentGeoRestricted: jest.fn(),
}));

const mockUseOnlineStatusContext =
  useOnlineStatusContext as jest.MockedFunction<typeof useOnlineStatusContext>;
const mockUseSharedContext = useSharedContext as jest.MockedFunction<
  typeof useSharedContext
>;
const mockUseAgentRunning = useAgentRunning as jest.MockedFunction<
  typeof useAgentRunning
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;
const mockUseActiveStakingContractDetails =
  useActiveStakingContractDetails as jest.MockedFunction<
    typeof useActiveStakingContractDetails
  >;
const mockUseIsInitiallyFunded = useIsInitiallyFunded as jest.MockedFunction<
  typeof useIsInitiallyFunded
>;
const mockUseIsAgentGeoRestricted =
  useIsAgentGeoRestricted as jest.MockedFunction<
    typeof useIsAgentGeoRestricted
  >;

// --- defaults ---

const defaultOnlineStatus = { isOnline: true };
const defaultSharedContext = { isAgentsFunFieldUpdateRequired: false };
const defaultAgentRunning = { isAnotherAgentRunning: false };
const defaultServices = {
  selectedAgentConfig: {
    isUnderConstruction: false,
    isGeoLocationRestricted: false,
  },
  selectedAgentType: 'trader',
  selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
  isLoading: false,
};
const defaultBalanceContext = {
  allowStartAgentByServiceConfigId: jest.fn().mockReturnValue(true),
  hasBalancesForServiceConfigId: jest.fn().mockReturnValue(true),
  isBalancesAndFundingRequirementsEnabledForAllServices: true,
  isBalancesAndFundingRequirementsLoadingForAllServices: false,
};
const defaultStakingDetails = {
  isAgentEvicted: false,
  isEligibleForStaking: true,
  isServiceStaked: false,
  hasEnoughServiceSlots: true,
  isSelectedStakingContractDetailsLoading: false,
};
const defaultIsInitiallyFunded = { isInitialFunded: true };
const defaultGeoRestricted = {
  isAgentGeoRestricted: false,
  isGeoLoading: false,
};

const setupDefaults = (
  overrides: {
    online?: Partial<typeof defaultOnlineStatus>;
    shared?: Partial<typeof defaultSharedContext>;
    running?: Partial<typeof defaultAgentRunning>;
    services?: Partial<typeof defaultServices>;
    balance?: Partial<typeof defaultBalanceContext>;
    staking?: Partial<typeof defaultStakingDetails>;
    funded?: Partial<typeof defaultIsInitiallyFunded>;
    geo?: Partial<typeof defaultGeoRestricted>;
  } = {},
) => {
  mockUseOnlineStatusContext.mockReturnValue({
    ...defaultOnlineStatus,
    ...overrides.online,
  } as ReturnType<typeof useOnlineStatusContext>);
  mockUseSharedContext.mockReturnValue({
    ...defaultSharedContext,
    ...overrides.shared,
  } as ReturnType<typeof useSharedContext>);
  mockUseAgentRunning.mockReturnValue({
    ...defaultAgentRunning,
    ...overrides.running,
  } as ReturnType<typeof useAgentRunning>);
  mockUseServices.mockReturnValue({
    ...defaultServices,
    ...overrides.services,
  } as unknown as ReturnType<typeof useServices>);
  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    ...defaultBalanceContext,
    ...overrides.balance,
  } as unknown as ReturnType<typeof useBalanceAndRefillRequirementsContext>);
  mockUseActiveStakingContractDetails.mockReturnValue({
    ...defaultStakingDetails,
    ...overrides.staking,
  } as ReturnType<typeof useActiveStakingContractDetails>);
  mockUseIsInitiallyFunded.mockReturnValue({
    ...defaultIsInitiallyFunded,
    ...overrides.funded,
  } as ReturnType<typeof useIsInitiallyFunded>);
  mockUseIsAgentGeoRestricted.mockReturnValue({
    ...defaultGeoRestricted,
    ...overrides.geo,
  } as ReturnType<typeof useIsAgentGeoRestricted>);
};

// --- tests ---

describe('useDeployability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaults();
  });

  describe('happy path', () => {
    it('returns canRun=true when all conditions are met', () => {
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.reason).toBeUndefined();
    });
  });

  describe('safeEligibility check (branch 1)', () => {
    it('returns canRun=false with safeEligibility reason when not ok and not loading', () => {
      const { result } = renderHook(() =>
        useDeployability({
          safeEligibility: {
            ok: false,
            reason: 'Missing backup signer',
            isLoading: false,
          },
        }),
      );
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe('Missing backup signer');
    });

    it('does not block when safeEligibility is ok', () => {
      const { result } = renderHook(() =>
        useDeployability({
          safeEligibility: { ok: true, isLoading: false },
        }),
      );
      expect(result.current.canRun).toBe(true);
    });

    it('does not block when safeEligibility is loading (defers to loading branch)', () => {
      const { result } = renderHook(() =>
        useDeployability({
          safeEligibility: { ok: false, reason: 'bad', isLoading: true },
        }),
      );
      // safeEligibility.isLoading adds "Safe" to loading reasons
      expect(result.current.isLoading).toBe(true);
      expect(result.current.reason).toBe(ELIGIBILITY_REASON.LOADING);
    });
  });

  describe('loading state (branch 2)', () => {
    it('returns loading when offline', () => {
      setupDefaults({ online: { isOnline: false } });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe(ELIGIBILITY_REASON.LOADING);
      expect(result.current.loadingReason).toContain('Offline');
    });

    it('returns loading when services are loading', () => {
      setupDefaults({ services: { isLoading: true } });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingReason).toContain('Services');
    });

    it('returns loading when balances not enabled for all services', () => {
      setupDefaults({
        balance: {
          isBalancesAndFundingRequirementsEnabledForAllServices: false,
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingReason).toContain('Balances');
    });

    it('returns loading when balances are loading for all services', () => {
      setupDefaults({
        balance: {
          isBalancesAndFundingRequirementsLoadingForAllServices: true,
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingReason).toContain('Balances');
    });

    it('returns loading when selected agent has no balances', () => {
      setupDefaults({
        balance: {
          hasBalancesForServiceConfigId: jest.fn().mockReturnValue(false),
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingReason).toContain('Balances');
    });

    it('returns loading when staking details are loading', () => {
      setupDefaults({
        staking: { isSelectedStakingContractDetailsLoading: true },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingReason).toContain('Staking');
    });

    it('returns loading when geo is loading', () => {
      setupDefaults({ geo: { isGeoLoading: true } });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingReason).toContain('Geo');
    });

    it('returns loading when isInitialFunded is undefined', () => {
      setupDefaults({ funded: { isInitialFunded: undefined } });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingReason).toContain('Setup');
    });

    it('accumulates multiple loading reasons', () => {
      setupDefaults({
        online: { isOnline: false },
        services: { isLoading: true },
        staking: { isSelectedStakingContractDetailsLoading: true },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.loadingReason).toBe('Offline, Services, Staking');
    });
  });

  describe('under construction (branch 3)', () => {
    it('returns canRun=false with "Under construction" reason', () => {
      setupDefaults();
      mockUseServices.mockReturnValue({
        ...defaultServices,
        selectedAgentConfig: {
          ...defaultServices.selectedAgentConfig,
          isUnderConstruction: true,
        },
      } as unknown as ReturnType<typeof useServices>);
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe('Under construction');
    });
  });

  describe('geo-restricted (branch 4)', () => {
    it('returns canRun=false when both isGeoLocationRestricted and isAgentGeoRestricted are true', () => {
      mockUseServices.mockReturnValue({
        ...defaultServices,
        selectedAgentConfig: {
          ...defaultServices.selectedAgentConfig,
          isGeoLocationRestricted: true,
        },
      } as unknown as ReturnType<typeof useServices>);
      setupDefaults({ geo: { isAgentGeoRestricted: true } });
      // Re-mock services after setupDefaults
      mockUseServices.mockReturnValue({
        ...defaultServices,
        selectedAgentConfig: {
          ...defaultServices.selectedAgentConfig,
          isGeoLocationRestricted: true,
        },
      } as unknown as ReturnType<typeof useServices>);
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe('Region restricted');
    });

    it('allows when agent is geo-restricted but config does not restrict it', () => {
      setupDefaults({ geo: { isAgentGeoRestricted: true } });
      // isGeoLocationRestricted defaults to false
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(true);
    });

    it('allows when config restricts but agent is not geo-restricted', () => {
      mockUseServices.mockReturnValue({
        ...defaultServices,
        selectedAgentConfig: {
          ...defaultServices.selectedAgentConfig,
          isGeoLocationRestricted: true,
        },
      } as unknown as ReturnType<typeof useServices>);
      setupDefaults({ geo: { isAgentGeoRestricted: false } });
      mockUseServices.mockReturnValue({
        ...defaultServices,
        selectedAgentConfig: {
          ...defaultServices.selectedAgentConfig,
          isGeoLocationRestricted: true,
        },
      } as unknown as ReturnType<typeof useServices>);
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(true);
    });
  });

  describe('another agent running (branch 5)', () => {
    it('returns canRun=false with "Another agent running" reason', () => {
      setupDefaults({ running: { isAnotherAgentRunning: true } });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe(
        ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING,
      );
    });
  });

  describe('no available slots (branch 6)', () => {
    it('returns canRun=false when hasEnoughServiceSlots=false and not staked', () => {
      setupDefaults({
        staking: {
          hasEnoughServiceSlots: false,
          isServiceStaked: false,
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe('No available slots');
    });

    it('allows when hasEnoughServiceSlots=false but service IS staked', () => {
      setupDefaults({
        staking: {
          hasEnoughServiceSlots: false,
          isServiceStaked: true,
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(true);
    });

    it('skips slot check when hasEnoughServiceSlots is null (uses isNil)', () => {
      setupDefaults({
        staking: {
          hasEnoughServiceSlots: null as unknown as boolean,
          isServiceStaked: false,
        },
      });
      const { result } = renderHook(() => useDeployability());
      // isNil(null) is true → !isNil(null) is false → branch skipped
      expect(result.current.canRun).toBe(true);
    });

    it('skips slot check when hasEnoughServiceSlots is undefined', () => {
      setupDefaults({
        staking: {
          hasEnoughServiceSlots: undefined as unknown as boolean,
          isServiceStaked: false,
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(true);
    });
  });

  describe('evicted and ineligible (branch 7)', () => {
    it('returns canRun=false when evicted and not eligible for staking', () => {
      setupDefaults({
        staking: {
          isAgentEvicted: true,
          isEligibleForStaking: false,
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe('Evicted');
    });

    it('allows when evicted but eligible for re-staking', () => {
      setupDefaults({
        staking: {
          isAgentEvicted: true,
          isEligibleForStaking: true,
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(true);
    });

    it('allows when not evicted regardless of eligibility', () => {
      setupDefaults({
        staking: {
          isAgentEvicted: false,
          isEligibleForStaking: false,
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(true);
    });
  });

  describe('AgentsFun field update required (branch 8)', () => {
    it('returns canRun=false with "Update required" reason', () => {
      setupDefaults({ shared: { isAgentsFunFieldUpdateRequired: true } });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe('Update required');
    });
  });

  describe('not initially funded (branch 9)', () => {
    it('returns canRun=false with "Unfinished setup" when isInitialFunded is false', () => {
      setupDefaults({ funded: { isInitialFunded: false } });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe('Unfinished setup');
    });

    it('allows when isInitialFunded is true', () => {
      setupDefaults({ funded: { isInitialFunded: true } });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(true);
    });
  });

  describe('low balance (branch 10)', () => {
    it('returns canRun=false with "Low balance" when allowStartAgent returns false', () => {
      setupDefaults({
        balance: {
          allowStartAgentByServiceConfigId: jest.fn().mockReturnValue(false),
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.canRun).toBe(false);
      expect(result.current.reason).toBe('Low balance');
    });
  });

  describe('no selected service', () => {
    it('returns loading when selectedService is null (no balances for null config id)', () => {
      setupDefaults({
        balance: {
          hasBalancesForServiceConfigId: jest.fn().mockReturnValue(false),
        },
      });
      mockUseServices.mockReturnValue({
        ...defaultServices,
        selectedService: null,
      } as unknown as ReturnType<typeof useServices>);
      const { result } = renderHook(() => useDeployability());
      // No service_config_id → hasSelectedAgentBalances=false → "Balances" loading
      expect(result.current.canRun).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingReason).toContain('Balances');
    });
  });

  describe('branch priority', () => {
    it('safeEligibility failure takes priority over everything else', () => {
      setupDefaults({
        running: { isAnotherAgentRunning: true },
        shared: { isAgentsFunFieldUpdateRequired: true },
      });
      const { result } = renderHook(() =>
        useDeployability({
          safeEligibility: {
            ok: false,
            reason: 'Safe check failed',
            isLoading: false,
          },
        }),
      );
      expect(result.current.reason).toBe('Safe check failed');
    });

    it('loading takes priority over under construction', () => {
      setupDefaults({ services: { isLoading: true } });
      mockUseServices.mockReturnValue({
        ...defaultServices,
        isLoading: true,
        selectedAgentConfig: {
          ...defaultServices.selectedAgentConfig,
          isUnderConstruction: true,
        },
      } as unknown as ReturnType<typeof useServices>);
      const { result } = renderHook(() => useDeployability());
      expect(result.current.reason).toBe(ELIGIBILITY_REASON.LOADING);
    });

    it('another agent running takes priority over slot check', () => {
      setupDefaults({
        running: { isAnotherAgentRunning: true },
        staking: { hasEnoughServiceSlots: false, isServiceStaked: false },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.reason).toBe(
        ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING,
      );
    });

    it('evicted takes priority over AgentsFun update', () => {
      setupDefaults({
        staking: { isAgentEvicted: true, isEligibleForStaking: false },
        shared: { isAgentsFunFieldUpdateRequired: true },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.reason).toBe('Evicted');
    });

    it('AgentsFun update required takes priority over initial funding', () => {
      setupDefaults({
        shared: { isAgentsFunFieldUpdateRequired: true },
        funded: { isInitialFunded: false },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.reason).toBe('Update required');
    });

    it('unfinished setup takes priority over low balance', () => {
      setupDefaults({
        funded: { isInitialFunded: false },
        balance: {
          allowStartAgentByServiceConfigId: jest.fn().mockReturnValue(false),
        },
      });
      const { result } = renderHook(() => useDeployability());
      expect(result.current.reason).toBe('Unfinished setup');
    });
  });
});
