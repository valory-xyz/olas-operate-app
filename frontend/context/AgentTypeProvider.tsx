import { createContext, FC, PropsWithChildren, useState } from 'react';

import { AgentType } from '@/enums/Agent';

export const AgentTypeContext = createContext<{
  agentType: AgentType;
  setAgentType: (agentType: AgentType) => void;
}>({
  agentType: AgentType.PredictTrader,
  setAgentType: () => {},
});

export const AgentTypeProvider: FC = ({ children }: PropsWithChildren) => {
  const [agentType, setAgentType] = useState<AgentType>(
    AgentType.PredictTrader,
  );

  return (
    <AgentTypeContext.Provider value={{ agentType, setAgentType }}>
      {children}
    </AgentTypeContext.Provider>
  );
};
