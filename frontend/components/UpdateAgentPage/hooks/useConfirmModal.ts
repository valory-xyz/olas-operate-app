import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useCallback, useState } from 'react';

import { useService } from '@/hooks/useService';
import { runPrestartCheck } from '@/hooks/useStartService';
import { ServicesService } from '@/service/Services';

import { useModal } from './useModal';

export const useConfirmUpdateModal = ({
  confirmCallback,
}: {
  confirmCallback: () => Promise<void>;
}) => {
  const modal = useModal();
  const queryClient = useQueryClient();
  const { isServiceRunning, service } = useService();

  const [pending, setPending] = useState(false);

  const restartIfServiceRunning = useCallback(async () => {
    if (isServiceRunning && service?.service_config_id) {
      try {
        message.info('Restarting service ...');
        await ServicesService.stopDeployment(service.service_config_id);
        await runPrestartCheck(queryClient, service.service_config_id);
        await ServicesService.startService(service.service_config_id);
      } catch (e) {
        console.error(e);
      }
    }
  }, [isServiceRunning, queryClient, service?.service_config_id]);

  const confirm = useCallback(async () => {
    setPending(true);
    message.loading({ content: 'Updating agent settings...', key: 'updating' });
    let failed = false;

    try {
      await confirmCallback();
      message.destroy('updating');
      message.success({ content: 'Agent settings updated successfully.' });

      // restart may be time consuming, no need to await here
      restartIfServiceRunning().catch(() =>
        message.error({ content: 'Failed to restart service.' }),
      );
    } catch (e) {
      console.error(e);
      failed = true;
    } finally {
      setPending(false);
    }

    if (!failed) return modal.closeModal();

    throw new Error('Failed to confirm');
  }, [confirmCallback, modal, restartIfServiceRunning]);

  return {
    ...modal,
    confirm,
    pending,
  };
};
