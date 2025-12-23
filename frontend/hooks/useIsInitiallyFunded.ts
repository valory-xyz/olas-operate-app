import { useCallback } from 'react';

import { useElectronApi } from './useElectronApi';
import { useServices } from './useServices';
import { useStore } from './useStore';

export const useIsInitiallyFunded = () => {
  const { storeState } = useStore();
  const electronApi = useElectronApi();
  const { selectedAgentType } = useServices();
  const isInitialFunded = storeState?.[selectedAgentType]?.isInitialFunded;

  const setIsInitiallyFunded = useCallback(() => {
    electronApi.store?.set?.(`${selectedAgentType}.isInitialFunded`, true);
  }, [electronApi.store, selectedAgentType]);

  return {
    isInitialFunded,
    setIsInitiallyFunded,
  };
};
