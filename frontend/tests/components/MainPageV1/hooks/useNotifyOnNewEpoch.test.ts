import { renderHook } from '@testing-library/react';

const mockShowNotification = jest.fn();

jest.mock('../../../../context/AutoRunProvider', () => ({
  useAutoRunContext: jest.fn(() => ({ enabled: false })),
}));
jest.mock('../../../../hooks', () => ({
  useActiveStakingContractDetails: jest.fn(() => ({
    selectedStakingContractDetails: { epochCounter: 10 },
    isSelectedStakingContractDetailsLoading: false,
    isAgentEvicted: false,
    isEligibleForStaking: true,
    hasEnoughServiceSlots: true,
    isServiceStaked: true,
  })),
  useBalanceAndRefillRequirementsContext: jest.fn(() => ({
    canStartAgent: true,
    isBalancesAndFundingRequirementsLoading: false,
  })),
  useIsInitiallyFunded: jest.fn(() => ({ isInitialFunded: true })),
  useService: jest.fn(() => ({ isServiceRunning: false })),
}));
jest.mock('../../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(() => ({
    showNotification: mockShowNotification,
  })),
}));
jest.mock('../../../../hooks/useRewardContext', () => ({
  useRewardContext: jest.fn(() => ({ isEligibleForRewards: false })),
}));
jest.mock('../../../../hooks/useServices', () => ({
  useServices: jest.fn(() => ({
    selectedAgentConfig: { isUnderConstruction: false },
    selectedService: { service_config_id: 'sc-1' },
  })),
}));

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
import { useNotifyOnNewEpoch } from '../../../../components/MainPageV1/hooks/useNotifyOnNewEpoch';

const mockUseAutoRunContext = useAutoRunContext as jest.Mock;
const mockUseActiveStakingContractDetails =
  useActiveStakingContractDetails as jest.Mock;
const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.Mock;
const mockUseIsInitiallyFunded = useIsInitiallyFunded as jest.Mock;
const mockUseService = useService as jest.Mock;
const mockUseElectronApi = useElectronApi as jest.Mock;
const mockUseRewardContext = useRewardContext as jest.Mock;
const mockUseServices = useServices as jest.Mock;

const defaultStakingDetails = {
  selectedStakingContractDetails: { epochCounter: 10 },
  isSelectedStakingContractDetailsLoading: false,
  isAgentEvicted: false,
  isEligibleForStaking: true,
  hasEnoughServiceSlots: true,
  isServiceStaked: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAutoRunContext.mockReturnValue({ enabled: false });
  mockUseElectronApi.mockReturnValue({
    showNotification: mockShowNotification,
  });
  mockUseRewardContext.mockReturnValue({ isEligibleForRewards: false });
  mockUseIsInitiallyFunded.mockReturnValue({ isInitialFunded: true });
  mockUseServices.mockReturnValue({
    selectedAgentConfig: { isUnderConstruction: false },
    selectedService: { service_config_id: 'sc-1' },
  });
  mockUseService.mockReturnValue({ isServiceRunning: false });
  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    canStartAgent: true,
    isBalancesAndFundingRequirementsLoading: false,
  });
  mockUseActiveStakingContractDetails.mockReturnValue(defaultStakingDetails);
});

describe('useNotifyOnNewEpoch', () => {
  it('notifies when all conditions are met and auto-run is disabled', () => {
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).toHaveBeenCalledWith(
      'Start your agent to avoid missing rewards and getting evicted.',
    );
  });

  it('does not notify when showNotification is undefined', () => {
    mockUseElectronApi.mockReturnValue({ showNotification: undefined });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when staking details are loading', () => {
    mockUseActiveStakingContractDetails.mockReturnValue({
      ...defaultStakingDetails,
      isSelectedStakingContractDetailsLoading: true,
    });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when agent config is under construction', () => {
    mockUseServices.mockReturnValue({
      selectedAgentConfig: { isUnderConstruction: true },
      selectedService: { service_config_id: 'sc-1' },
    });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when initial funding is not done', () => {
    mockUseIsInitiallyFunded.mockReturnValue({ isInitialFunded: false });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when service is not staked and no slots available', () => {
    mockUseActiveStakingContractDetails.mockReturnValue({
      ...defaultStakingDetails,
      isServiceStaked: false,
      hasEnoughServiceSlots: false,
    });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when agent is evicted and not eligible for staking', () => {
    mockUseActiveStakingContractDetails.mockReturnValue({
      ...defaultStakingDetails,
      isAgentEvicted: true,
      isEligibleForStaking: false,
    });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when service is running', () => {
    mockUseService.mockReturnValue({ isServiceRunning: true });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when already eligible for rewards', () => {
    mockUseRewardContext.mockReturnValue({ isEligibleForRewards: true });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when balance requirements are loading', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      canStartAgent: true,
      isBalancesAndFundingRequirementsLoading: true,
    });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when cannot start agent', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      canStartAgent: false,
      isBalancesAndFundingRequirementsLoading: false,
    });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when auto-run is enabled', () => {
    mockUseAutoRunContext.mockReturnValue({ enabled: true });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when epoch is undefined', () => {
    mockUseActiveStakingContractDetails.mockReturnValue({
      ...defaultStakingDetails,
      selectedStakingContractDetails: { epochCounter: undefined },
    });
    renderHook(() => useNotifyOnNewEpoch());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });
});
