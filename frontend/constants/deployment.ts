export const MiddlewareDeploymentStatusMap = {
  CREATED: 0,
  BUILT: 1,
  DEPLOYING: 2,
  DEPLOYED: 3,
  STOPPING: 4,
  STOPPED: 5,
  DELETED: 6,
} as const;

export type MiddlewareDeploymentStatus =
  (typeof MiddlewareDeploymentStatusMap)[keyof typeof MiddlewareDeploymentStatusMap];

/**
 * Deployment statuses where the service is considered active/running
 * (including transitional active states).
 */
const ACTIVE_DEPLOYMENT_STATUSES: readonly MiddlewareDeploymentStatus[] = [
  MiddlewareDeploymentStatusMap.DEPLOYED,
  MiddlewareDeploymentStatusMap.DEPLOYING,
  MiddlewareDeploymentStatusMap.STOPPING,
] as const;

/**
 * Deployment statuses where the service is in transition.
 */
const TRANSITIONING_DEPLOYMENT_STATUSES: readonly MiddlewareDeploymentStatus[] =
  [
    MiddlewareDeploymentStatusMap.DEPLOYING,
    MiddlewareDeploymentStatusMap.STOPPING,
  ] as const;

export const isActiveDeploymentStatus = (
  status?: MiddlewareDeploymentStatus | null,
): status is MiddlewareDeploymentStatus =>
  status !== undefined &&
  status !== null &&
  ACTIVE_DEPLOYMENT_STATUSES.includes(status);

export const isTransitioningDeploymentStatus = (
  status?: MiddlewareDeploymentStatus | null,
): status is MiddlewareDeploymentStatus =>
  status !== undefined &&
  status !== null &&
  TRANSITIONING_DEPLOYMENT_STATUSES.includes(status);
