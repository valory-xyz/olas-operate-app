import { renderHook } from '@testing-library/react';

import { useNotifyOnAgentRewards } from '../../../../components/MainPage/hooks/useNotifyOnAgentRewards';
import { MiddlewareDeploymentStatusMap } from '../../../../constants/deployment';
import { useElectronApi } from '../../../../hooks/useElectronApi';
import { useRewardContext } from '../../../../hooks/useRewardContext';
import { useServices } from '../../../../hooks/useServices';

jest.mock('../../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));
jest.mock('../../../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));
jest.mock('../../../../hooks/useRewardContext', () => ({
  useRewardContext: jest.fn(),
}));

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseRewardContext = useRewardContext as jest.MockedFunction<
  typeof useRewardContext
>;

const mockShowNotification = jest.fn();

const setupMocks = (overrides: {
  showNotification?: jest.Mock | undefined;
  deploymentStatus?: number;
  isEligibleForRewards?: boolean | undefined;
}) => {
  mockUseElectronApi.mockReturnValue({
    showNotification: overrides.showNotification,
  } as ReturnType<typeof useElectronApi>);

  mockUseServices.mockReturnValue({
    selectedService: {
      deploymentStatus:
        overrides.deploymentStatus ?? MiddlewareDeploymentStatusMap.DEPLOYED,
    },
  } as ReturnType<typeof useServices>);

  mockUseRewardContext.mockReturnValue({
    isEligibleForRewards: overrides.isEligibleForRewards,
  } as ReturnType<typeof useRewardContext>);
};

describe('useNotifyOnAgentRewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not notify when showNotification is undefined', () => {
    setupMocks({
      showNotification: undefined,
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      isEligibleForRewards: true,
    });

    renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when service is not DEPLOYED', () => {
    setupMocks({
      showNotification: mockShowNotification,
      deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      isEligibleForRewards: true,
    });

    renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when isEligibleForRewards is false', () => {
    setupMocks({
      showNotification: mockShowNotification,
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      isEligibleForRewards: false,
    });

    renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('shows notification when isEligibleForRewards transitions from false to true', () => {
    // Start with false
    setupMocks({
      showNotification: mockShowNotification,
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      isEligibleForRewards: false,
    });

    const { rerender } = renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).not.toHaveBeenCalled();

    // Transition to true
    setupMocks({
      showNotification: mockShowNotification,
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      isEligibleForRewards: true,
    });

    rerender();

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    expect(mockShowNotification).toHaveBeenCalledWith(
      "Your agent earned its rewards! It's now idle and will resume working next epoch.",
    );
  });

  it('does not re-notify when isEligibleForRewards stays true', () => {
    // First render: transition from undefined to true triggers notification
    setupMocks({
      showNotification: mockShowNotification,
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      isEligibleForRewards: true,
    });

    const { rerender } = renderHook(() => useNotifyOnAgentRewards());

    // First render: prevRef is undefined, isEligibleForRewards is true → notifies
    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    mockShowNotification.mockClear();

    // Rerender with same true value — should NOT notify again
    rerender();
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('does not notify when isEligibleForRewards is undefined', () => {
    setupMocks({
      showNotification: mockShowNotification,
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      isEligibleForRewards: undefined,
    });

    renderHook(() => useNotifyOnAgentRewards());
    expect(mockShowNotification).not.toHaveBeenCalled();
  });
});
