import { renderHook } from '@testing-library/react';

import { MiddlewareDeploymentStatusMap } from '../../../../constants/deployment';

const mockSetTrayIcon = jest.fn();

jest.mock('../../../../hooks', () => ({
  useElectronApi: jest.fn(() => ({ setTrayIcon: mockSetTrayIcon })),
  useServices: jest.fn(() => ({
    selectedService: { service_config_id: 'sc-1' },
  })),
  useService: jest.fn(() => ({ deploymentStatus: undefined })),
  useBalanceAndRefillRequirementsContext: jest.fn(() => ({
    isPearlWalletRefillRequired: false,
  })),
}));

import {
  useElectronApi,
  useServices,
  useService,
  useBalanceAndRefillRequirementsContext,
} from '../../../../hooks';
import { useSetupTrayIcon } from '../../../../components/MainPageV1/hooks/useSetupTrayIcon';

const mockUseElectronApi = useElectronApi as jest.Mock;
const mockUseService = useService as jest.Mock;
const mockUseBalanceAndRefillRequirementsContext =
  useBalanceAndRefillRequirementsContext as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseElectronApi.mockReturnValue({ setTrayIcon: mockSetTrayIcon });
  (useServices as jest.Mock).mockReturnValue({
    selectedService: { service_config_id: 'sc-1' },
  });
  mockUseService.mockReturnValue({ deploymentStatus: undefined });
  mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
    isPearlWalletRefillRequired: false,
  });
});

describe('useSetupTrayIcon', () => {
  it('does not set tray icon when setTrayIcon is undefined', () => {
    mockUseElectronApi.mockReturnValue({ setTrayIcon: undefined });
    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).not.toHaveBeenCalled();
  });

  it('sets low-gas icon when pearl wallet refill is required', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      isPearlWalletRefillRequired: true,
    });
    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('low-gas');
  });

  it('sets running icon when deployed', () => {
    mockUseService.mockReturnValue({
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
    });
    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('running');
  });

  it('sets paused icon when stopped', () => {
    mockUseService.mockReturnValue({
      deploymentStatus: MiddlewareDeploymentStatusMap.STOPPED,
    });
    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('paused');
  });

  it('sets logged-out icon when built', () => {
    mockUseService.mockReturnValue({
      deploymentStatus: MiddlewareDeploymentStatusMap.BUILT,
    });
    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('logged-out');
  });

  it('low-gas takes priority over deployment status', () => {
    mockUseBalanceAndRefillRequirementsContext.mockReturnValue({
      isPearlWalletRefillRequired: true,
    });
    mockUseService.mockReturnValue({
      deploymentStatus: MiddlewareDeploymentStatusMap.DEPLOYED,
    });
    renderHook(() => useSetupTrayIcon());
    expect(mockSetTrayIcon).toHaveBeenCalledWith('low-gas');
  });
});
