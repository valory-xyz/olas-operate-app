import {
  Button,
  Flex,
  Layout,
  Menu,
  MenuProps,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { useCallback, useEffect, useMemo } from 'react';
import {
  TbHelpSquareRounded,
  TbPlus,
  TbSettings,
  TbWallet,
} from 'react-icons/tb';
import styled from 'styled-components';

import { ACTIVE_AGENTS, AVAILABLE_FOR_ADDING_AGENTS } from '@/config/agents';
import { CHAIN_CONFIG } from '@/config/chains';
import { AgentType, EvmChainId } from '@/constants';
import { COLOR } from '@/constants/colors';
import { ANTD_BREAKPOINTS, APP_HEIGHT, SIDER_WIDTH } from '@/constants/width';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import {
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';
import { AgentConfig } from '@/types/Agent';

import { UpdateAvailableAlert } from './UpdateAvailableAlert/UpdateAvailableAlert';
import { UpdateAvailableModal } from './UpdateAvailableAlert/UpdateAvailableModal';

const { Sider } = Layout;
const { Text } = Typography;

const SIDEBAR_BREAKPOINT = 'md';

const SiderContainer = styled.div`
  display: flex;
  border-right: 1px solid ${COLOR.GRAY_4};
  height: ${APP_HEIGHT}px;
  .ant-layout-sider-children {
    @media (min-width: ${ANTD_BREAKPOINTS[SIDEBAR_BREAKPOINT] + 1}px) {
      display: flex;
      width: 100%;
    }
  }
`;

// TODO: make reusable for new styled buttons in Pearl v1
const ResponsiveButton = styled(Button)`
  @media (max-width: ${ANTD_BREAKPOINTS[SIDEBAR_BREAKPOINT]}px) {
    > span:not(.ant-btn-icon) {
      display: none;
    }
  }
`;

const PearlWalletLabel = () => {
  const { isPearlWalletRefillRequired } =
    useBalanceAndRefillRequirementsContext();

  return (
    <Flex>
      <Text>Pearl Wallet</Text>
      {isPearlWalletRefillRequired && (
        <Tag color="red" className="ml-8" bordered={false}>
          Low
        </Tag>
      )}
    </Flex>
  );
};

const menuItems: MenuProps['items'] = [
  {
    key: Pages.PearlWallet,
    icon: <TbWallet size={20} />,
    label: <PearlWalletLabel />,
  },
  {
    key: Pages.HelpAndSupport,
    icon: <TbHelpSquareRounded size={20} />,
    label: 'Help Center',
  },
  { key: Pages.Settings, icon: <TbSettings size={20} />, label: 'Settings' },
];

const MyAgentsHeader = () => (
  <>
    <Flex justify="center" className="mt-24 mb-16">
      <Image src="/happy-robot.svg" alt="Happy Robot" width={40} height={40} />
    </Flex>
    <Text className="font-weight-600">My Agents</Text>
  </>
);

type AgentList = {
  name: string;
  agentType: AgentType;
  chainName: string;
  chainId: EvmChainId;
}[];

type AgentListMenuProps = {
  myAgents: AgentList;
  selectedMenuKeys: (Pages | AgentType)[];
  onAgentSelect: MenuProps['onClick'];
};
const AgentListMenu = ({
  myAgents,
  selectedMenuKeys,
  onAgentSelect,
}: AgentListMenuProps) => (
  <Menu
    selectedKeys={selectedMenuKeys}
    mode="inline"
    inlineIndent={4}
    onClick={onAgentSelect}
    className="mt-16"
    items={myAgents.map((agent) => ({
      key: agent.agentType,
      icon: (
        <Image
          src={`/agent-${agent.agentType}-icon.png`}
          alt={agent.name}
          width={32}
          height={32}
        />
      ),
      label: (
        <Flex justify="space-between" align="center">
          {agent.name}{' '}
          <Image
            src={`/chains/${kebabCase(agent.chainName)}-chain.png`}
            alt={`${agent.chainName} logo`}
            width={14}
            height={14}
          />
        </Flex>
      ),
    }))}
  />
);

export const Sidebar = () => {
  const { goto: gotoSetup } = useSetup();
  const { pageState, goto: gotoPage } = usePageState();

  // TODO: in order for predict to display correctly,
  // we need to create a dummy service before going to main page
  const { services, isLoading, selectedAgentType, updateAgentType } =
    useServices();

  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();

  const myAgents = useMemo(() => {
    if (!services) return [];
    return services.reduce<AgentList>((result, service) => {
      const agent = ACTIVE_AGENTS.find(
        ([, agentConfig]) =>
          agentConfig.servicePublicId === service.service_public_id &&
          agentConfig.middlewareHomeChainId === service.home_chain,
      );
      if (!agent) return result;

      const [agentType, agentConfig] = agent as [AgentType, AgentConfig];
      if (!agentConfig.evmHomeChainId) return result;
      const chainId = agentConfig.evmHomeChainId;
      const chainName = CHAIN_CONFIG[chainId].name;
      result.push({ name: agentConfig.name, agentType, chainName, chainId });
      return result;
    }, []);
  }, [services]);

  // if the selectedAgentType is not in myAgents, select the first one
  useEffect(() => {
    const isSelectedAgentAvailable = myAgents.some(
      (agent) => agent.agentType === selectedAgentType,
    );
    if (isSelectedAgentAvailable) return;

    if (selectedAgentType && myAgents.length > 0) {
      updateAgentType(myAgents[0].agentType);
    }
  }, [myAgents, selectedAgentType, updateAgentType]);

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
      gotoSetup(SetupScreen.FundYourAgent);
    }
  };

  const handleMenuClick = useCallback<NonNullable<MenuProps['onClick']>>(
    ({ key }) => {
      gotoPage(key as Pages);
    },
    [gotoPage],
  );

  const selectedMenuKey = useMemo(() => {
    if (menuItems.find((item) => item?.key === pageState)) {
      return [pageState];
    }
    return [selectedAgentType];
  }, [pageState, selectedAgentType]);

  return (
    <SiderContainer>
      <Sider breakpoint={SIDEBAR_BREAKPOINT} theme="light" width={SIDER_WIDTH}>
        <Flex vertical flex={1} className="p-16" justify="space-between">
          <div>
            <MyAgentsHeader />
            {isLoading || isMasterWalletLoading ? (
              <Spin />
            ) : myAgents.length > 0 ? (
              <AgentListMenu
                myAgents={myAgents}
                selectedMenuKeys={selectedMenuKey}
                onAgentSelect={handleAgentSelect}
              />
            ) : null}

            {myAgents.length < AVAILABLE_FOR_ADDING_AGENTS.length && (
              <ResponsiveButton
                size="large"
                className="self-center w-max"
                onClick={() => {
                  gotoPage(Pages.Setup);
                  gotoSetup(SetupScreen.AgentOnboarding);
                }}
                icon={<TbPlus size={20} />}
              >
                Add New Agent
              </ResponsiveButton>
            )}
          </div>

          <div>
            <UpdateAvailableAlert />
            <UpdateAvailableModal />

            <Menu
              selectedKeys={selectedMenuKey}
              mode="inline"
              inlineIndent={12}
              onClick={handleMenuClick}
              items={menuItems}
            />
          </div>
        </Flex>
      </Sider>
    </SiderContainer>
  );
};
