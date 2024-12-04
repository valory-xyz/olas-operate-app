import {
  MiddlewareDeploymentStatus,
  MiddlewareServiceResponse,
} from '@/client';

export type Service = MiddlewareServiceResponse & {
  deploymentStatus?: MiddlewareDeploymentStatus;
};
