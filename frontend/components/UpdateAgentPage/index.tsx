import { AgentMap } from '@/constants/agent';
import { useServices } from '@/hooks/useServices';

import {
  AgentFormContainer,
  useDisplayAgentForm,
} from '../SetupPage/SetupYourAgent/useDisplayAgentForm';
import { AgentsFunUpdateSetup } from './components/AgentsFunUpdateSetup';
import { ModiusUpdatePage } from './components/ModiusUpdateForm';
import { OptimusUpdatePage } from './components/OptimusUpdateForm';
import { PredictUpdatePage } from './components/PredictUpdateForm';
import { UpdateAgentProvider } from './context/UpdateAgentProvider';

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
