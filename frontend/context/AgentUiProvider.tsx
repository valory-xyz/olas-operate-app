import { noop } from 'lodash';
import { PropsWithChildren, useContext, useEffect } from 'react';

import { usePrevious } from '@/hooks/usePrevious';
import { useServices } from '@/hooks/useServices';

import { ElectronApiContext } from './ElectronApiProvider';

export const AgentUiProvider = ({ children }: PropsWithChildren) => {
  const { selectedAgentType } = useServices();
  const prevSelectedAgentType = usePrevious(selectedAgentType);
  const { hide } = useAgentUi();

  //   Hide agent activity window when agent type changes
  useEffect(() => {
    if (selectedAgentType != prevSelectedAgentType) {
      hide?.();
    }
  }, [hide, prevSelectedAgentType, selectedAgentType]);

  return children;
};

export const useAgentUi = () => {
  const electronApiContext = useContext(ElectronApiContext);
  if (!electronApiContext.agentActivityWindow) {
    return {
      show: noop,
      hide: noop,
      close: noop,
      goto: noop,
      minimize: noop,
    };
  }
  return electronApiContext.agentActivityWindow;
};
