import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useConfirmUpdateModal } from '../../../../components/UpdateAgentPage/hooks/useConfirmModal';
import { useService } from '../../../../hooks/useService';
import { ServicesService } from '../../../../service/Services';
import { DEFAULT_SERVICE_CONFIG_ID } from '../../../helpers/factories';

jest.mock('antd', () => ({
  message: {
    loading: jest.fn(),
    destroy: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../../../hooks/useService', () => ({
  useService: jest.fn(),
}));
jest.mock('../../../../service/Services', () => ({
  ServicesService: {
    stopDeployment: jest.fn(),
    startService: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { message } = require('antd') as {
  message: {
    loading: jest.Mock;
    destroy: jest.Mock;
    success: jest.Mock;
    info: jest.Mock;
    error: jest.Mock;
  };
};

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockStopDeployment = ServicesService.stopDeployment as jest.Mock;
const mockStartService = ServicesService.startService as jest.Mock;

describe('useConfirmUpdateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockReturnValue({
      isServiceRunning: false,
      service: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    } as ReturnType<typeof useService>);
    mockStopDeployment.mockResolvedValue(undefined);
    mockStartService.mockResolvedValue(undefined);
  });

  it('starts with open=false and pending=false', () => {
    const { result } = renderHook(() =>
      useConfirmUpdateModal({ confirmCallback: jest.fn() }),
    );
    expect(result.current.open).toBe(false);
    expect(result.current.pending).toBe(false);
  });

  it('calls confirmCallback and shows success message on confirm', async () => {
    const confirmCallback = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useConfirmUpdateModal({ confirmCallback }),
    );

    act(() => {
      result.current.openModal();
    });

    await act(async () => {
      await result.current.confirm();
    });

    expect(confirmCallback).toHaveBeenCalledTimes(1);
    expect(message.loading).toHaveBeenCalledWith({
      content: 'Updating agent settings...',
      key: 'updating',
    });
    expect(message.success).toHaveBeenCalledWith({
      content: 'Agent settings updated successfully.',
    });
    expect(result.current.open).toBe(false);
  });

  it('throws "Failed to confirm" when confirmCallback rejects', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const confirmCallback = jest
      .fn()
      .mockRejectedValue(new Error('Update failed'));
    const { result } = renderHook(() =>
      useConfirmUpdateModal({ confirmCallback }),
    );

    act(() => {
      result.current.openModal();
    });

    await expect(
      act(async () => {
        await result.current.confirm();
      }),
    ).rejects.toThrow('Failed to confirm');
    consoleSpy.mockRestore();
  });

  it('sets pending=false after confirm regardless of outcome', async () => {
    const confirmCallback = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useConfirmUpdateModal({ confirmCallback }),
    );

    await act(async () => {
      await result.current.confirm();
    });

    expect(result.current.pending).toBe(false);
  });

  describe('restartIfServiceRunning', () => {
    it('restarts service when service is running', async () => {
      mockUseService.mockReturnValue({
        isServiceRunning: true,
        service: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
      } as ReturnType<typeof useService>);

      const confirmCallback = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useConfirmUpdateModal({ confirmCallback }),
      );

      await act(async () => {
        await result.current.confirm();
      });

      // Allow fire-and-forget restart to complete
      await new Promise((r) => setTimeout(r, 0));

      expect(mockStopDeployment).toHaveBeenCalledWith(
        DEFAULT_SERVICE_CONFIG_ID,
      );
      expect(mockStartService).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
    });

    it('does not restart when service is not running', async () => {
      mockUseService.mockReturnValue({
        isServiceRunning: false,
        service: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
      } as ReturnType<typeof useService>);

      const confirmCallback = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useConfirmUpdateModal({ confirmCallback }),
      );

      await act(async () => {
        await result.current.confirm();
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(mockStopDeployment).not.toHaveBeenCalled();
      expect(mockStartService).not.toHaveBeenCalled();
    });

    it('catches restart error internally without propagating', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockUseService.mockReturnValue({
        isServiceRunning: true,
        service: { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
      } as ReturnType<typeof useService>);
      mockStopDeployment.mockRejectedValue(new Error('Stop failed'));

      const confirmCallback = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useConfirmUpdateModal({ confirmCallback }),
      );

      await act(async () => {
        await result.current.confirm();
      });

      // Allow fire-and-forget restart to settle
      await new Promise((r) => setTimeout(r, 0));

      // Internal try/catch logs the error but does not propagate
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
