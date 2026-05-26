import { ServicesService } from '@/service/Services';
import { ServiceDeployment } from '@/types/Agent';

import { DEPLOYMENT_CHECK_TIMEOUT_MS } from '../constants';

/**
 * Single-shot deployment probe used by auto-run start/stop/wait loops.
 *
 * Wraps `ServicesService.getDeployment` with a bounded `AbortController` so a
 * hung middleware response can't stall a rotation cycle. Centralised so the
 * three call sites (start short-circuit, stop confirm, run confirm) share
 * identical timeout/abort semantics.
 *
 * Re-throws on abort/network errors; callers decide whether to fall through
 * to a real start (start path) or keep polling (wait paths).
 */
export const probeDeploymentStatus = async (
  serviceConfigId: string,
): Promise<ServiceDeployment> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEPLOYMENT_CHECK_TIMEOUT_MS,
  );
  try {
    return await ServicesService.getDeployment({
      serviceConfigId,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
