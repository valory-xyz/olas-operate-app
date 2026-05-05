import { renderHook } from '@testing-library/react';

import { useNotifyOnNewEpoch } from '../../../../components/MainPage/hooks/useNotifyOnNewEpoch';
import { useAutoRunContext } from '../../../../context/AutoRunProvider';
import {
  useActiveStakingContractDetails,
  useBalanceAndRefillRequirementsContext,
  useIsInitiallyFunded,
  useService,
} from '../../../../hooks';
import { useElectronApi } from '../../../../hooks/useElectronApi';
import { useRewardContext } from '../../../../hooks/useRewardContext';
import { useServices } from '../../../../hooks/useServices';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

jest.mock('../../../../context/AutoRunProvider', () => ({
  useAutoRunContext: jest.fn(),
}));
jest.mock('../../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));
jest.mock('../../../../hooks/useRewardContext', () => ({
  useRewardContext: jest.fn(),
}));
jest.mock('../../../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../../../hooks', () => ({
  useActiveStakingContractDetails: jest.fn(),
  useBalanceAndRefillRequirementsContext: jest.fn(),
  useIsInitiallyFunded: jest.fn(),
  useService: jest.fn(),
}));

const mockUseAutoRunContext = useAutoRunContext as jest.MockedFunction<
  typeof useAutoRunContext
>;
const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUseRewardContext = useRewardContext as jest.MockedFunction<
  typeof useRewardContext
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseActiveStakingContractDetails =
  useActiveStakingContractDetails as jest.MockedFunction<
    typeof useActiveStakingContractDetails
  >;
const mockUseBalance =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;
const mockUseIsInitiallyFunded = useIsInitiallyFunded as jest.MockedFunction<
  typeof useIsInitiallyFunded
>;
const mockUseService = useService as jest.MockedFunction<typeof useService>;

const mockShowNotification = jest.fn();

const EXPECTED_MESSAGE =
  'Start your agent to avoid missing rewards and getting evicted.';

/**
 * Returns a mock state where ALL guard conditions pass,
 * so the notification WOULD fire.
 */
const createPassingMockState = () => ({
  autoRun: {
    enabled: false,
  },
  electronApi: {
    showNotification: mockShowNotification,
  },
  rewardContext: {
    isEligibleForRewards: false,
  },
  services: {
    selectedAgentConfig: { isUnderConstruction: false },
    selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
  },
  service: {
    isServiceRunning: false,
  },
  isInitiallyFunded: {
    isInitialFunded: true,
  },
  balance: {
    canStartAgent: true,
    isBalancesAndFundingRequirementsLoading: false,
  },
  stakingDetails: {
    selectedStakingContractDetails: { epochCounter: 42 },
    isSelectedStakingContractDetailsLoading: false,
    isAgentEvicted: false,
    isEligibleForStaking: true,
    hasEnoughServiceSlots: true,
    isServiceStaked: true,
  },
});

type MockState = ReturnType<typeof createPassingMockState>;

const applyMocks = (state: MockState) => {
  mockUseAutoRunContext.mockReturnValue(
    state.autoRun as ReturnType<typeof useAutoRunContext>,
  );
  mockUseElectronApi.mockReturnValue(
    state.electronApi as unknown as ReturnType<typeof useElectronApi>,
  );
  mockUseRewardContext.mockReturnValue(
    state.rewardContext as ReturnType<typeof useRewardContext>,
  );
  mockUseServices.mockReturnValue(
    state.services as unknown as ReturnType<typeof useServices>,
  );
  mockUseService.mockReturnValue(
    state.service as ReturnType<typeof useService>,
  );
  mockUseIsInitiallyFunded.mockReturnValue(
    state.isInitiallyFunded as ReturnType<typeof useIsInitiallyFunded>,
  );
  mockUseBalance.mockReturnValue(
    state.balance as ReturnType<typeof useBalanceAndRefillRequirementsContext>,
  );
  mockUseActiveStakingContractDetails.mockReturnValue(
    state.stakingDetails as ReturnType<typeof useActiveStakingContractDetails>,
  );
};

describe('useNotifyOnNewEpoch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows notification when all guards pass and epoch is set', () => {
    const state = createPassingMockState();
    applyMocks(state);

    renderHook(() => useNotifyOnNewEpoch());

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    expect(mockShowNotification).toHaveBeenCalledWith(EXPECTED_MESSAGE);
  });

  describe('guard conditions that prevent notification', () => {
    it('does not notify when showNotification is undefined', () => {
      const state = createPassingMockState();
      state.electronApi.showNotification = undefined as unknown as jest.Mock;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when isSelectedStakingContractDetailsLoading is true', () => {
      const state = createPassingMockState();
      state.stakingDetails.isSelectedStakingContractDetailsLoading = true;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when selectedAgentConfig.isUnderConstruction is true', () => {
      const state = createPassingMockState();
      state.services.selectedAgentConfig.isUnderConstruction = true;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when isInitialFunded is false', () => {
      const state = createPassingMockState();
      state.isInitiallyFunded.isInitialFunded = false;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when isServiceStaked=false AND hasEnoughServiceSlots=false', () => {
      const state = createPassingMockState();
      state.stakingDetails.isServiceStaked = false;
      state.stakingDetails.hasEnoughServiceSlots = false as unknown as boolean;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when isAgentEvicted=true AND isEligibleForStaking=false', () => {
      const state = createPassingMockState();
      state.stakingDetails.isAgentEvicted = true;
      state.stakingDetails.isEligibleForStaking = false;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when isServiceRunning is true', () => {
      const state = createPassingMockState();
      state.service.isServiceRunning = true;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when isEligibleForRewards is true', () => {
      const state = createPassingMockState();
      state.rewardContext.isEligibleForRewards = true;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when isBalancesAndFundingRequirementsLoading is true', () => {
      const state = createPassingMockState();
      state.balance.isBalancesAndFundingRequirementsLoading = true;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when canStartAgent is false', () => {
      const state = createPassingMockState();
      state.balance.canStartAgent = false;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when epoch is undefined', () => {
      const state = createPassingMockState();
      state.stakingDetails.selectedStakingContractDetails = {
        epochCounter: undefined,
      } as unknown as (typeof state.stakingDetails)['selectedStakingContractDetails'];
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when epoch is null (no staking contract details)', () => {
      const state = createPassingMockState();
      state.stakingDetails.selectedStakingContractDetails =
        null as unknown as (typeof state.stakingDetails)['selectedStakingContractDetails'];
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('does not notify when auto-run enabled is true', () => {
      const state = createPassingMockState();
      state.autoRun.enabled = true;
      applyMocks(state);

      renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).not.toHaveBeenCalled();
    });
  });

  describe('epoch change behavior', () => {
    it('does not re-notify for the same epoch', () => {
      const state = createPassingMockState();
      applyMocks(state);

      const { rerender } = renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).toHaveBeenCalledTimes(1);
      mockShowNotification.mockClear();

      // Rerender with same epoch — should not notify again
      rerender();
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('notifies again when epoch changes', () => {
      const state = createPassingMockState();
      applyMocks(state);

      const { rerender } = renderHook(() => useNotifyOnNewEpoch());

      expect(mockShowNotification).toHaveBeenCalledTimes(1);
      mockShowNotification.mockClear();

      // Change epoch
      const updatedState = createPassingMockState();
      updatedState.stakingDetails.selectedStakingContractDetails = {
        epochCounter: 43,
      };
      applyMocks(updatedState);

      rerender();
      expect(mockShowNotification).toHaveBeenCalledTimes(1);
      expect(mockShowNotification).toHaveBeenCalledWith(EXPECTED_MESSAGE);
    });
  });
});
