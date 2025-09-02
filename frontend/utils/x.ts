import { MiddlewareServiceResponse, ServiceTemplate } from '@/client';

/**
 * Get the X username from the service description.
 * @param service - The service template object.
 * @returns The X username or null if not found.
 *
 * @example
 * getXUsername({ description: "Agents.Fun @exampleUser" }) => "exampleUser"
 */
export const getXUsername = (
  service?: ServiceTemplate | MiddlewareServiceResponse,
) => {
  if (!service) return null;

  const match = service.description.match(/@(\w+)/);
  return match ? match[1] : null;
};
