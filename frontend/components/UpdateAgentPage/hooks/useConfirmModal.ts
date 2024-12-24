import { useCallback, useState } from 'react';

import { useService } from '@/hooks/useService';
import { ServicesService } from '@/service/Services';

import { useModal } from './useModal';

export const useConfirmUpdateModal = ({
  confirmCallback,
}: {
  confirmCallback: () => Promise<void>;
}) => {
  const modal = useModal();
  const { isServiceRunning, service } = useService();

  const [pending, setPending] = useState(false);

  const restartIfServiceRunning = useCallback(async () => {
    if (isServiceRunning && service?.service_config_id) {
      try {
        ServicesService.stopDeployment(service?.service_config_id).then(() =>
          ServicesService.startService(service?.service_config_id),
        );
      } catch (e) {
        console.error(e);
      }
    }
  }, [isServiceRunning, service?.service_config_id]);

  const confirm = useCallback(async () => {
    setPending(true);
    let failed = false;

    try {
      await confirmCallback();

      // restart may be time consuming, no need to await here
      restartIfServiceRunning();
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
