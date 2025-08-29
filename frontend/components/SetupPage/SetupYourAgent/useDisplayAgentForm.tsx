import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import React, { ReactNode, useCallback } from 'react';
import styled from 'styled-components';

import { AgentHeader } from '@/components/ui/AgentHeader';
import { COLOR } from '@/constants/colors';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { SetupScreen } from '@/enums/SetupScreen';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';

const { Title } = Typography;

export const AgentFormContainer = styled(Flex)`
  margin: -44px 0;
  background: ${COLOR.WHITE};
  .setup-left-content {
    width: 492px;
    margin: 0 auto;
    padding: 64px 0;
  }
  .setup-right-content {
    width: 392px;
    padding: 64px 32px;
    background: ${COLOR.BACKGROUND};
    .ant-typography {
      font-size: 14px !important;
    }
  }
`;

export const useDisplayAgentForm = () => {
  const { goto } = useSetup();
  const { selectedAgentType } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  const displayForm = useCallback(
    (form: ReactNode, desc: ReactNode, onBack?: () => void) => {
      if (!serviceTemplate) return null;

      return (
        <>
          <Flex vertical className="setup-left-content">
            <AgentHeader
              onPrev={onBack ? onBack : () => goto(SetupScreen.AgentOnboarding)}
              hideLogo
            />
            <Title level={3} style={{ margin: '16px 0 24px 0' }}>
              Configure Your Agent
            </Title>
            {form}
          </Flex>

          <Flex vertical gap={24} className="setup-right-content">
            <InfoCircleOutlined
              style={{ fontSize: 24, color: COLOR.TEXT_LIGHT }}
            />
            {desc}
          </Flex>
        </>
      );
    },
    [serviceTemplate, goto],
  );

  return displayForm;
};
