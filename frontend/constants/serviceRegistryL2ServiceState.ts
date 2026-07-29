// Reflects the state of a service in the ServiceRegistryL2 contract
export const SERVICE_REGISTRY_L2_SERVICE_STATE = {
  NonExistent: 0,
  PreRegistration: 1,
  ActiveRegistration: 2,
  FinishedRegistration: 3,
  Deployed: 4,
  TerminatedBonded: 5,
} as const;

export type ServiceRegistryL2ServiceState =
  (typeof SERVICE_REGISTRY_L2_SERVICE_STATE)[keyof typeof SERVICE_REGISTRY_L2_SERVICE_STATE];
