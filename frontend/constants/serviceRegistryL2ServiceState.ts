// Reflects the state of a service in the ServiceRegistryL2 contract (i.e. https://gnosisscan.io/address/0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8)
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
