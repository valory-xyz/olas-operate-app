import {
  PlusOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Button, Flex, Layout, Menu, MenuProps, Spin, Typography } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';
import styled from 'styled-components';

import { ACTIVE_AGENTS } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import { EvmChainId } from '@/constants/chains';
import { COLOR } from '@/constants/colors';
import { TOP_BAR_HEIGHT } from '@/constants/width';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useMasterWalletContext } from '@/hooks/useWallet';

const { Sider } = Layout;
const { Text } = Typography;

const SiderContainer = styled.div`
  display: flex;
  border-right: 1px solid ${COLOR.GRAY_4};

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
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();

  // TODO: in order for predict to display correctly,
  // we need to create a dummy service before going to main page
  const { services, isLoading, selectedAgentType, updateAgentType } =
    useServices();

  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();

  const myAgents = useMemo(() => {
    if (!services) return [];
    return services.reduce<
      {
        name: string;
        agentType: string;
        chainName: string;
        chainId: EvmChainId;
      }[]
    >((result, service) => {
      const agent = ACTIVE_AGENTS.find(
        ([, agentConfig]) =>
          agentConfig.middlewareHomeChainId === service.home_chain,
      );
      if (!agent) return result;

      const [agentType, agentConfig] = agent;
      const chainId = agentConfig.evmHomeChainId;
      const chainName = CHAIN_CONFIG[chainId].name;
      result.push({ name: agentConfig.name, agentType, chainName, chainId });
      return result;
    }, []);
  }, [services]);

  const handleAgentSelect: MenuProps['onClick'] = (info) => {
    updateAgentType(info.key as AgentType);

    const agent = myAgents.find((item) => item.agentType === info.key);
    const isSafeCreated = masterSafes?.find(
      (masterSafe) => masterSafe.evmChainId === agent?.chainId,
    );

    if (isSafeCreated) {
      gotoPage(Pages.Main);
    } else {
      gotoPage(Pages.Setup);
      // TODO: make back button on funding screen properly sending back to main
      // if was redirected from here
      gotoSetup(SetupScreen.SetupEoaFundingIncomplete);
    }
  };

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'help': {
        gotoPage(Pages.HelpAndSupport);
        return;
      }
      case 'settings': {
        gotoPage(Pages.Settings);
        return;
      }
      case 'agent-form-settings': {
        gotoPage(Pages.UpdateAgentTemplate);
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
          {isLoading || isMasterWalletLoading ? (
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
                label: (
                  <Flex justify="space-between" align="center">
                    {agent.name}{' '}
                    <Image
                      src={`/chains/${kebabCase(agent.chainName)}-chain.png`}
                      width={14}
                      height={14}
                      alt={`${agent.chainName} logo`}
                    />
                  </Flex>
                ),
              }))}
            />
          ) : null}
          {myAgents.length < ACTIVE_AGENTS.length && (
            <Button
              size="large"
              className="self-center w-max"
              onClick={() => {
                gotoPage(Pages.Setup);
                gotoSetup(SetupScreen.AgentOnboarding);
              }}
              icon={<PlusOutlined />}
            >
              Add New Agent
            </Button>
          )}

          <Menu
            mode="inline"
            inlineIndent={12}
            className="mt-auto"
            onClick={handleMenuClick}
            items={[
              {
                key: 'wallet',
                icon: <WalletOutlined />,
                label: 'Pearl Wallet',
                disabled: true,
              },
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
