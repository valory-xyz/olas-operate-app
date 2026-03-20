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
import Image from 'next/image';
import { useCallback, useEffect, useMemo } from 'react';
import {
  TbHelpSquareRounded,
  TbPlus,
  TbSettings,
  TbWallet,
} from 'react-icons/tb';
import styled from 'styled-components';

import {
  AgentType,
  ANTD_BREAKPOINTS,
  COLOR,
  PAGES,
  Pages,
  SETUP_SCREEN,
  SIDER_WIDTH,
} from '@/constants';
import {
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';

import { BackupSeedPhraseAlert } from '../BackupSeedPhraseAlert';
import { useSidebarAgents } from '../hooks/useSidebarAgents';
import { UpdateAvailableAlert } from '../UpdateAvailableAlert/UpdateAvailableAlert';
import { UpdateAvailableModal } from '../UpdateAvailableAlert/UpdateAvailableModal';
import { AgentListMenu } from './AgentListMenu';
import { ArchiveAgentModal } from './ArchiveAgentModal';
import { AutoRunControl } from './AutoRunControl';

const { Sider } = Layout;
const { Text } = Typography;

const SIDEBAR_BREAKPOINT = 'md';

const SiderContainer = styled.div`
  display: flex;
  border-right: 1px solid ${COLOR.GRAY_4};
  height: 100vh;
  .ant-layout-sider-children {
    @media (min-width: ${ANTD_BREAKPOINTS[SIDEBAR_BREAKPOINT] + 1}px) {
      display: flex;
      width: 100%;
      overflow: auto;
    }
  }
  .ant-menu-item.menu-running-agent {
    padding-right: 0 !important;
  }
`;

const ResponsiveButton = styled(Button)`
  @media (max-width: ${ANTD_BREAKPOINTS[SIDEBAR_BREAKPOINT]}px) {
    > span:not(.ant-btn-icon) {
      display: none;
    }
  }
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

export const Sidebar = () => {
  const { goto: gotoSetup } = useSetup();
  const { pageState, goto: gotoPage } = usePageState();
  const { isLoading, selectedAgentType, updateAgentType } = useServices();
  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();

  const {
    myAgents,
    pendingArchiveAgent,
    setPendingArchiveAgent,
    pendingArchiveAgentName,
    handleArchiveConfirm,
    canAddNewAgents,
  } = useSidebarAgents();

  // If the selectedAgentType is not in myAgents, select the first one
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

  return (
    <SiderContainer>
      <Sider breakpoint={SIDEBAR_BREAKPOINT} theme="light" width={SIDER_WIDTH}>
        <Flex vertical flex={1} className="p-16" justify="space-between">
          <div>
            <MyAgentsHeader />

            <Flex vertical gap={16} className="w-full">
              <Flex justify="space-between" align="center">
                <Text className="font-weight-600" style={{ flex: 1 }}>
                  My Agents
                </Text>
                <AutoRunControl />
              </Flex>
              {isLoading || isMasterWalletLoading ? (
                <AgentMenuLoading />
              ) : myAgents.length > 0 ? (
                <AgentListMenu
                  myAgents={myAgents}
                  selectedMenuKeys={selectedMenuKey}
                  onAgentSelect={handleAgentSelect}
                  onArchiveRequest={setPendingArchiveAgent}
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

      <ArchiveAgentModal
        agentName={pendingArchiveAgentName}
        open={!!pendingArchiveAgent}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setPendingArchiveAgent(undefined)}
      />
    </SiderContainer>
  );
};
