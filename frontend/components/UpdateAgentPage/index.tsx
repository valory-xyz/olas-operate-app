import { AgentMap } from '@/constants/agent';
import { useServices } from '@/hooks/useServices';

import {
  AgentFormContainer,
  useDisplayAgentForm,
} from '../SetupPage/SetupYourAgent/useDisplayAgentForm';
import { AgentsFunUpdateSetup } from './AgentsFunUpdateSetup';
import { UpdateAgentProvider } from './context/UpdateAgentProvider';
import { ModiusUpdatePage } from './ModiusUpdateForm';
import { OptimusUpdatePage } from './OptimusUpdateForm';
import { PredictUpdatePage } from './PredictUpdateForm';

export const UpdateAgentPage = () => {
  const { selectedAgentType } = useServices();
  const displayForm = useDisplayAgentForm();

  return (
    <AgentFormContainer>
      <UpdateAgentProvider>
        {selectedAgentType === AgentMap.PredictTrader && (
          <PredictUpdatePage renderForm={displayForm} />
        )}
        {selectedAgentType === AgentMap.AgentsFun && <AgentsFunUpdateSetup />}
        {selectedAgentType === AgentMap.Modius && (
          <ModiusUpdatePage renderForm={displayForm} />
        )}
        {selectedAgentType === AgentMap.Optimus && (
          <OptimusUpdatePage renderForm={displayForm} />
        )}
      </UpdateAgentProvider>
    </AgentFormContainer>
  );
};
