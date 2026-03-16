/**
 * Tests for ServiceRegistry L2 on-chain service state constants.
 *
 * These values are returned by the ServiceRegistryL2 contract and used to
 * determine whether a service is registered, deployed, or terminated.
 * Wrong values cause the UI to misread contract state (e.g., treating a
 * deployed service as pre-registration).
 */

import { SERVICE_REGISTRY_L2_SERVICE_STATE } from '../../constants/serviceRegistryL2ServiceState';

describe('SERVICE_REGISTRY_L2_SERVICE_STATE', () => {
  it('NonExistent is 0 (default unregistered state)', () => {
    expect(SERVICE_REGISTRY_L2_SERVICE_STATE.NonExistent).toBe(0);
  });

  it('PreRegistration is 1', () => {
    expect(SERVICE_REGISTRY_L2_SERVICE_STATE.PreRegistration).toBe(1);
  });

  it('ActiveRegistration is 2', () => {
    expect(SERVICE_REGISTRY_L2_SERVICE_STATE.ActiveRegistration).toBe(2);
  });

  it('FinishedRegistration is 3', () => {
    expect(SERVICE_REGISTRY_L2_SERVICE_STATE.FinishedRegistration).toBe(3);
  });

  it('Deployed is 4', () => {
    expect(SERVICE_REGISTRY_L2_SERVICE_STATE.Deployed).toBe(4);
  });

  it('TerminatedBonded is 5', () => {
    expect(SERVICE_REGISTRY_L2_SERVICE_STATE.TerminatedBonded).toBe(5);
  });

  it('covers exactly 6 states with consecutive values 0–5', () => {
    const values = Object.values(SERVICE_REGISTRY_L2_SERVICE_STATE);
    expect(values).toHaveLength(6);
    expect(values.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('has no duplicate numeric values', () => {
    const values = Object.values(SERVICE_REGISTRY_L2_SERVICE_STATE);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
