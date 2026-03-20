import { useCallback, useMemo } from 'react';

import { useElectronApi } from './useElectronApi';
import { useServices } from './useServices';
import { useStore } from './useStore';

export const useIsInitiallyFunded = () => {
  const { storeState } = useStore();
  const electronApi = useElectronApi();
  const { selectedAgentType, selectedServiceConfigId } = useServices();

  const isInitialFunded = useMemo(() => {
    const stored = storeState?.[selectedAgentType]?.isInitialFunded;
    if (stored === undefined) return;
    // We can't handle boolean before the one-time migration
    if (typeof stored === 'boolean') return;
    if (!selectedServiceConfigId) return undefined;
    // If the service has no entry in the record, it hasn't been funded yet
    return stored[selectedServiceConfigId] ?? false;
  }, [storeState, selectedAgentType, selectedServiceConfigId]);

  const setIsInitiallyFunded = useCallback(() => {
    if (!selectedServiceConfigId) return;

    const current = storeState?.[selectedAgentType]?.isInitialFunded;
    const existing =
      typeof current === 'object' && current !== null ? current : {};

    electronApi.store?.set?.(`${selectedAgentType}.isInitialFunded`, {
      ...existing,
      [selectedServiceConfigId]: true,
    });
  }, [
    electronApi.store,
    selectedAgentType,
    selectedServiceConfigId,
    storeState,
  ]);

  return {
    isInitialFunded,
    setIsInitiallyFunded,
  };
};
