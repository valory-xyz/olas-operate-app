import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import React, { ReactNode, useCallback } from 'react';
import styled from 'styled-components';

import { BackButton } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { COLOR } from '@/constants/colors';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useServices, useSetup } from '@/hooks';

const { Title } = Typography;

export const AgentFormContainer = styled(Flex)<{ $hasMinHeight?: boolean }>`
  background: ${COLOR.WHITE};
  flex: 1;
  min-height: ${({ $hasMinHeight }) => ($hasMinHeight ? '100%' : 'auto')};

  .setup-left-content {
    width: 492px;
    margin: 0 auto;
    padding: 64px 0;
  }
  .setup-right-content {
    width: 336px;
    padding: 64px 32px;
    box-sizing: content-box;
    background: ${COLOR.GRAY_1};
    .ant-typography {
      font-size: 14px !important;
    }
  }
`;

export type RenderForm = (
  form: ReactNode,
  desc: ReactNode,
  options?: {
    isUpdate?: boolean;
    onBack: (() => void) | undefined;
  },
) => ReactNode;

export const useDisplayAgentForm = () => {
  const { goto } = useSetup();
  const { selectedAgentType, selectedAgentConfig } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  const displayForm = useCallback(
    (
      form: ReactNode,
      desc: ReactNode,
      options?: { isUpdate?: boolean; onBack: (() => void) | undefined },
    ) => {
      const { isUpdate, onBack } = options || {};
      if (!serviceTemplate) return null;

      return (
        <>
          <Flex vertical className="setup-left-content">
            <BackButton
              onPrev={
                onBack ? onBack : () => goto(SETUP_SCREEN.AgentOnboarding)
              }
            />
            <Title level={3} style={{ margin: '16px 0 24px 0' }}>
              {isUpdate
                ? 'Agent Settings'
                : `Configure Your ${selectedAgentConfig?.displayName} Agent`}
            </Title>
            {form}
          </Flex>

          <Flex vertical gap={24} className="setup-right-content">
            <InfoCircleOutlined
              style={{ fontSize: 22, color: COLOR.TEXT_LIGHT }}
            />
            {desc}
          </Flex>
        </>
      );
    },
    [serviceTemplate, selectedAgentConfig?.displayName, goto],
  );

  return displayForm;
};
