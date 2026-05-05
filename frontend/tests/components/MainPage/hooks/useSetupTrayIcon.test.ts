import { renderHook } from '@testing-library/react';

import { useSetupTrayIcon } from '../../../../components/MainPage/hooks/useSetupTrayIcon';
import { MiddlewareDeploymentStatusMap } from '../../../../constants/deployment';
import {
  useBalanceAndRefillRequirementsContext,
  useElectronApi,
  useService,
  useServices,
} from '../../../../hooks';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

jest.mock('../../../../hooks', () => ({
  useBalanceAndRefillRequirementsContext: jest.fn(),
  useElectronApi: jest.fn(),
  useService: jest.fn(),
  useServices: jest.fn(),
}));

const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;
const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockUseBalance =
  useBalanceAndRefillRequirementsContext as jest.MockedFunction<
    typeof useBalanceAndRefillRequirementsContext
  >;

const mockSetTrayIcon = jest.fn();

const setupMocks = (overrides?: {
  setTrayIcon?: jest.Mock | null;
  deploymentStatus?: number;
  isPearlWalletRefillRequired?: boolean;
}) => {
  const resolvedOverrides = overrides ?? {};
  const setTrayIcon =
    'setTrayIcon' in resolvedOverrides
      ? (resolvedOverrides.setTrayIcon ?? undefined)
      : mockSetTrayIcon;
  const deploymentStatus =
    resolvedOverrides.deploymentStatus ??
    MiddlewareDeploymentStatusMap.DEPLOYED;
  const isPearlWalletRefillRequired =
    resolvedOverrides.isPearlWalletRefillRequired ?? false;

  mockUseElectronApi.mockReturnValue({
    setTrayIcon,
  } as unknown as ReturnType<typeof useElectronApi>);

  mockUseServices.mockReturnValue({
    selectedService: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
  } as unknown as ReturnType<typeof useServices>);

  mockUseService.mockReturnValue({
    deploymentStatus,
  } as ReturnType<typeof useService>);

  mockUseBalance.mockReturnValue({
    isPearlWalletRefillRequired,
  } as ReturnType<typeof useBalanceAndRefillRequirementsContext>);
};

describe('useSetupTrayIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when setTrayIcon is undefined', () => {
    setupMocks({ setTrayIcon: null });

    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).not.toHaveBeenCalled();
  });

  it('sets "low-gas" when isPearlWalletRefillRequired is true regardless of deployment status', () => {
    setupMocks({
      isPearlWalletRefillRequired: true,
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
    });

    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('low-gas');
  });

  it('sets "running" when DEPLOYED and refill is not required', () => {
    setupMocks({
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
      isPearlWalletRefillRequired: false,
    });

    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('running');
  });

  it('sets "paused" when STOPPED and refill is not required', () => {
    setupMocks({
      deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
      isPearlWalletRefillRequired: false,
    });

    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('paused');
  });

  it('sets "logged-out" when BUILT and refill is not required', () => {
    setupMocks({
      deploymentStatus: MiddlewareDeploymentStatusMap.BUILT,
      isPearlWalletRefillRequired: false,
    });

    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('logged-out');
  });
});
