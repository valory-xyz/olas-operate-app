import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';

const IS_FEATURE_ENABLED = false;

/**
 * This hook is used to notify the user when a new epoch is created
 * and agent is not running.
 */
const useNotifyOnNewEpoch = () => {
  const { showNotification } = useElectronApi();
  const { isServiceNotRunning } = useServices();

  // if agent is running, no need to show notification
  if (!isServiceNotRunning) return;

  if (!showNotification) return;
  if (!IS_FEATURE_ENABLED) return; // TODO: remove

  showNotification(
    'Start your agent to avoid missing rewards and getting evicted',
  );
};

export const useSystemLevelNotifications = () => {
  useNotifyOnNewEpoch();
};
