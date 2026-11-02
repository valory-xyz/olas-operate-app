import { ServicesService } from '@/service/Services';
import { ServiceDeployment } from '@/types/Agent';

import { DEPLOYMENT_CHECK_TIMEOUT_MS } from '../constants';

/**
 * Bound deployment reads so a hung middleware request cannot stall Auto-run.
 * Callers decide how to retry abort/network errors; idle recovery must not
 * treat a failed read as proof that nothing is running.
 */
const probeDeploymentRequest = async <T>(
  read: (signal: AbortSignal) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEPLOYMENT_CHECK_TIMEOUT_MS,
  );
  try {
    return await read(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const probeDeploymentStatus = (
  serviceConfigId: string,
): Promise<ServiceDeployment> =>
  probeDeploymentRequest((signal) =>
    ServicesService.getDeployment({ serviceConfigId, signal }),
  );

/** Confirm the slot is empty without relying on the deployment query cache. */
export const probeAllDeploymentStatuses = () =>
  probeDeploymentRequest((signal) =>
    ServicesService.getAllServiceDeployments(signal),
  );
