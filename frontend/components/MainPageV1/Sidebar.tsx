import {
  PlusOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button, Flex, Layout, Menu, MenuProps, Spin, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

import { ACTIVE_AGENTS } from '@/config/agents';
import { TOP_BAR_HEIGHT } from '@/constants/width';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';

const { Sider } = Layout;
const { Text } = Typography;

const SiderContainer = styled.div`
  display: flex;

  .ant-layout-sider {
    margin-top: -${TOP_BAR_HEIGHT}px;
    margin-bottom: -${TOP_BAR_HEIGHT}px;
    padding-top: ${TOP_BAR_HEIGHT}px;
  }

  .ant-layout-sider-children {
    display: flex;
    width: 100%;
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  flex: auto;
  gap: 16px;
  padding: 16px;
`;

export const Sidebar = () => {
  const { goto } = usePageState();

  // TODO: in order for predict to display correctly,
  // we need to create a dummy service before going to main page
  const { services, isLoading, selectedAgentType } = useServices();

  const myAgents = useMemo(() => {
    if (!services) return [];
    return services.reduce<{ name: string; agentType: string }[]>(
      (result, service) => {
        const agent = ACTIVE_AGENTS.find(
          ([_, agentConfig]) =>
            agentConfig.middlewareHomeChainId === service.home_chain,
        );
        if (!agent) return result;

        const [agentType, agentConfig] = agent;
        result.push({ name: agentConfig.name, agentType });
        return result;
      },
      [],
    );
  }, [services]);

  const handleAgentSelect: MenuProps['onClick'] = (info) => {
    console.log('agent item clicked', info);
  };

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'help': {
        goto(Pages.HelpAndSupport);
        return;
      }
      case 'settings': {
        goto(Pages.Settings);
        return;
      }
    }
  };

  return (
    <SiderContainer>
      <Sider breakpoint="lg" theme="light" width={256}>
        <Content>
          <Flex justify="center" className="mt-24">
            <Image
              src="/happy-robot.svg"
              alt="Happy Robot"
              width={40}
              height={40}
            />
          </Flex>
          <Text className="font-weight-600">My Agents</Text>
          {isLoading ? (
            <Spin />
          ) : myAgents.length > 0 ? (
            <Menu
              defaultSelectedKeys={[selectedAgentType]}
              mode="inline"
              inlineIndent={4}
              onClick={handleAgentSelect}
              items={myAgents.map((agent) => ({
                key: agent.agentType,
                icon: (
                  <Image
                    src={`/agent-${agent.agentType}-icon.png`}
                    width={32}
                    height={32}
                    alt={agent.name}
                  />
                ),
                label: agent.name,
              }))}
            />
          ) : null}
          <Button
            size="large"
            className="self-center w-max"
            onClick={() => goto(Pages.SwitchAgent)}
            icon={<PlusOutlined />}
          >
            Add New Agent
          </Button>

          <Menu
            mode="inline"
            inlineIndent={12}
            className="mt-auto"
            onClick={handleMenuClick}
            items={[
              {
                key: 'help',
                icon: <QuestionCircleOutlined />,
                label: 'Help',
              },
              {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Settings',
              },
            ]}
          />
        </Content>
      </Sider>
    </SiderContainer>
  );
};
