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
