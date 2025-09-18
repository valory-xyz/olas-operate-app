import { ConfigProvider } from 'antd';

import { AgentMap } from '@/constants/agent';
import { useServices } from '@/hooks/useServices';
import { LOCAL_FORM_THEME } from '@/theme';

import {
  AgentFormContainer,
  useDisplayAgentForm,
} from '../SetupPage/SetupYourAgent/useDisplayAgentForm';
import { AgentsFunUpdateSetup } from './AgentsFunUpdateSetup';
import { UpdateAgentProvider } from './context/UpdateAgentProvider';
import { ModiusUpdatePage } from './ModiusUpdateForm';
import { OptimusUpdatePage } from './OptimusUpdateForm';
import { PredictUpdateSetup } from './PredictUpdateSetup';

export const UpdateAgentPage = () => {
  const { selectedAgentType } = useServices();
  const displayForm = useDisplayAgentForm();

  return (
    <AgentFormContainer>
      <UpdateAgentProvider>
        <ConfigProvider theme={LOCAL_FORM_THEME}>
          {selectedAgentType === AgentMap.PredictTrader && (
            <PredictUpdateSetup />
          )}
          {selectedAgentType === AgentMap.AgentsFun && <AgentsFunUpdateSetup />}
          {selectedAgentType === AgentMap.Modius && (
            <ModiusUpdatePage renderForm={displayForm} />
          )}
          {selectedAgentType === AgentMap.Optimus && (
            <OptimusUpdatePage renderForm={displayForm} />
          )}
        </ConfigProvider>
      </UpdateAgentProvider>
    </AgentFormContainer>
  );
};
