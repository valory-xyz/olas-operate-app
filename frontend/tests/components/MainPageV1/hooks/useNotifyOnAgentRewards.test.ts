import { renderHook } from '@testing-library/react';

import { MiddlewareDeploymentStatusMap } from '../../../../constants/deployment';

const mockShowNotification = jest.fn();

jest.mock('../../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(() => ({
    showNotification: mockShowNotification,
  })),
}));
jest.mock('../../../../hooks/useServices', () => ({
  useServices: jest.fn(() => ({
    selectedService: {
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
    },
  })),
}));
jest.mock('../../../../hooks/useRewardContext', () => ({
  useRewardContext: jest.fn(() => ({
    isEligibleForRewards: undefined,
  })),
}));

import { useElectronApi } from '../../../../hooks/useElectronApi';
import { useServices } from '../../../../hooks/useServices';
import { useRewardContext } from '../../../../hooks/useRewardContext';
import { useNotifyOnAgentRewards } from '../../../../components/MainPageV1/hooks/useNotifyOnAgentRewards';

const mockUseElectronApi = useElectronApi as jest.Mock;
const mockUseServices = useServices as jest.Mock;
const mockUseRewardContext = useRewardContext as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseElectronApi.mockReturnValue({
    showNotification: mockShowNotification,
  });
  mockUseServices.mockReturnValue({
    selectedService: {
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
    },
  });
  mockUseRewardContext.mockReturnValue({ isEligibleForRewards: undefined });
});

describe('useNotifyOnAgentRewards', () => {
  it('does not notify when showNotification is undefined', () => {
    mockUseElectronApi.mockReturnValue({ showNotification: undefined });
    renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when agent is not deployed', () => {
    mockUseServices.mockReturnValue({
      selectedService: {
        deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      },
    });
    renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when eligibility is undefined', () => {
    mockUseRewardContext.mockReturnValue({ isEligibleForRewards: undefined });
    renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('notifies when agent becomes eligible for rewards', () => {
    mockUseRewardContext.mockReturnValue({ isEligibleForRewards: true });
    renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).toHaveBeenCalledWith(
      "Your agent earned its rewards! It's now idle and will resume working next epoch.",
    );
  });

  it('does not re-notify when eligibility remains true across re-renders', () => {
    mockUseRewardContext.mockReturnValue({ isEligibleForRewards: true });
    const { rerender } = renderHook(() => useNotifyOnAgentRewards());

    mockShowNotification.mockClear();
    rerender();

    expect(mockShowNotification).not.toHaveBeenCalled();
  });
});
