import { noop } from 'lodash';
import { PropsWithChildren, useContext, useEffect, useRef } from 'react';

import { usePrevious } from '@/hooks/usePrevious';
import { useServices } from '@/hooks/useServices';

import { ElectronApiContext } from './ElectronApiProvider';

export const useAgentUi = () => {
  const electronApiContext = useContext(ElectronApiContext);
  if (!electronApiContext.agentActivityWindow) {
    return {
      init: noop,
      show: noop,
      hide: noop,
      close: noop,
      goto: noop,
      minimize: noop,
    };
  }
  return electronApiContext.agentActivityWindow;
};

export const AgentUiProvider = ({ children }: PropsWithChildren) => {
  const { selectedAgentType } = useServices();
  const prevSelectedAgentType = usePrevious(selectedAgentType);
  const { hide, init } = useAgentUi();

  useRef(() => init?.());

  // Hide agent activity window when agent type changes
  useEffect(() => {
    if (prevSelectedAgentType === undefined) return;
    if (selectedAgentType != prevSelectedAgentType) {
      hide?.();
    }
  }, [hide, prevSelectedAgentType, selectedAgentType]);

  return children;
};
