import {
  Button,
  Flex,
  Layout,
  Menu,
  MenuProps,
  Skeleton,
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
import {
  AgentType,
  ANTD_BREAKPOINTS,
  APP_HEIGHT,
  COLOR,
  EvmChainId,
  PAGES,
  Pages,
  SETUP_SCREEN,
  SIDER_WIDTH,
} from '@/constants';
import {
  useAgentRunning,
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';

import { BackupSeedPhraseAlert } from '../BackupSeedPhraseAlert';
import { UpdateAvailableAlert } from '../UpdateAvailableAlert/UpdateAvailableAlert';
import { UpdateAvailableModal } from '../UpdateAvailableAlert/UpdateAvailableModal';
import { PulseDot } from './PulseDot';

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

const ResponsiveButton = styled(Button)`
  @media (max-width: ${ANTD_BREAKPOINTS[SIDEBAR_BREAKPOINT]}px) {
    > span:not(.ant-btn-icon) {
      display: none;
    }
  }
`;

const RunningDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${COLOR.RED};
  box-shadow: 0 0 0 2px ${COLOR.WHITE};
`;

const AgentMenuLoading = () => (
  <Flex vertical gap={8}>
    <Skeleton.Input active block />
    <Skeleton.Input active block />
  </Flex>
);

const MyAgentsHeader = () => (
  <Flex justify="center" className="mt-24 mb-16">
    <Image src="/happy-robot.svg" alt="Happy Robot" width={40} height={40} />
  </Flex>
);

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
    key: PAGES.PearlWallet,
    icon: <TbWallet size={20} />,
    label: <PearlWalletLabel />,
  },
  {
    key: PAGES.HelpAndSupport,
    icon: <TbHelpSquareRounded size={20} />,
    label: 'Help Center',
  },
  { key: PAGES.Settings, icon: <TbSettings size={20} />, label: 'Settings' },
];

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
  runningAgentType: AgentType | null;
};
const AgentListMenu = ({
  myAgents,
  selectedMenuKeys,
  onAgentSelect,
  runningAgentType,
}: AgentListMenuProps) => (
  <Menu
    selectedKeys={selectedMenuKeys}
    mode="inline"
    inlineIndent={4}
    onClick={onAgentSelect}
    items={myAgents.map((agent) => ({
      key: agent.agentType,
      icon: (
        <Image
          key={agent.agentType}
          src={`/agent-${agent.agentType}-icon.png`}
          className="rounded-4"
          alt={agent.name}
          width={32}
          height={32}
        />
      ),
      label: (
        <Flex justify="space-between" align="center">
          <span>{agent.name}</span>
          {runningAgentType === agent.agentType ? (
            <PulseDot />
          ) : (
            <Image
              src={`/chains/${kebabCase(agent.chainName)}-chain.png`}
              alt={`${agent.chainName} logo`}
              width={14}
              height={14}
            />
          )}
        </Flex>
      ),
    }))}
  />
);

export const Sidebar = () => {
  const { goto: gotoSetup } = useSetup();
  const { pageState, goto: gotoPage } = usePageState();
  const { runningAgentType } = useAgentRunning();

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

      const [agentType, agentConfig] = agent;
      if (!agentConfig.evmHomeChainId) return result;

      const chainId = agentConfig.evmHomeChainId;
      const chainName = CHAIN_CONFIG[chainId].name;
      const name = agentConfig.displayName;
      result.push({ name, agentType, chainName, chainId });
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
      gotoPage(PAGES.Main);
    } else {
      gotoPage(PAGES.Setup);

      // TODO: make back button on funding screen properly sending back to main
      // if was redirected from here
      gotoSetup(SETUP_SCREEN.FundYourAgent);
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

  const canAddNewAgents = useMemo(() => {
    const availableAgents = myAgents.filter((agent) => {
      return AVAILABLE_FOR_ADDING_AGENTS.some(
        ([agentType]) => agentType === agent.agentType,
      );
    });

    return availableAgents.length < AVAILABLE_FOR_ADDING_AGENTS.length;
  }, [myAgents]);

  return (
    <SiderContainer>
      <Sider breakpoint={SIDEBAR_BREAKPOINT} theme="light" width={SIDER_WIDTH}>
        <Flex vertical flex={1} className="p-16" justify="space-between">
          <div>
            <MyAgentsHeader />

            <Flex vertical gap={16}>
              <Text className="font-weight-600">My Agents</Text>
              {isLoading || isMasterWalletLoading ? (
                <AgentMenuLoading />
              ) : myAgents.length > 0 ? (
                <AgentListMenu
                  myAgents={myAgents}
                  selectedMenuKeys={selectedMenuKey}
                  onAgentSelect={handleAgentSelect}
                  runningAgentType={runningAgentType}
                />
              ) : null}

              {canAddNewAgents && (
                <ResponsiveButton
                  size="large"
                  className="flex mx-auto"
                  onClick={() => {
                    gotoPage(PAGES.Setup);
                    gotoSetup(SETUP_SCREEN.AgentOnboarding);
                  }}
                  icon={<TbPlus size={20} />}
                >
                  Add New Agent
                </ResponsiveButton>
              )}
            </Flex>
          </div>

          <div>
            <BackupSeedPhraseAlert />
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
