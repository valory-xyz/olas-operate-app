import { useServices } from './useServices';
import { useStore } from './useStore';

export const useIsInitiallyFunded = () => {
  const { storeState } = useStore();
  const { selectedAgentType } = useServices();
  const isInitialFunded = storeState?.[selectedAgentType]?.isInitialFunded;

  return {
    isInitialFunded,
  };
};
