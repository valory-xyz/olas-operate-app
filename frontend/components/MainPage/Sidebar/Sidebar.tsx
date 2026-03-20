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

import { ACTIVE_AGENTS } from '@/config/agents';
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
  useAgentRunning,
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';
import { asEvmChainId, getServiceInstanceName } from '@/utils';

import { BackupSeedPhraseAlert } from '../BackupSeedPhraseAlert';
import { UpdateAvailableAlert } from '../UpdateAvailableAlert/UpdateAvailableAlert';
import { UpdateAvailableModal } from '../UpdateAvailableAlert/UpdateAvailableModal';
import { AgentTreeMenu } from './AgentTreeMenu';
import { AutoRunControl } from './AutoRunControl';
import { SidebarAgentGroup } from './types';

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
    }
  }
`;

const AgentListScrollArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
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

const bottomMenuItems: MenuProps['items'] = [
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
  const {
    services,
    isLoading,
    selectedServiceConfigId,
    updateSelectedInstance,
  } = useServices();
  const { runningServiceConfigId } = useAgentRunning();
  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();

  const agentGroups = useMemo<SidebarAgentGroup[]>(() => {
    if (!services) return [];

    const groupMap = new Map<AgentType, SidebarAgentGroup>();

    for (const service of services) {
      const agentEntry = ACTIVE_AGENTS.find(
        ([, config]) =>
          config.servicePublicId === service.service_public_id &&
          config.middlewareHomeChainId === service.home_chain,
      );
      if (!agentEntry) continue;

      const [agentType, config] = agentEntry;
      if (!groupMap.has(agentType)) {
        groupMap.set(agentType, { agentType, instances: [] });
      }

      groupMap.get(agentType)!.instances.push({
        serviceConfigId: service.service_config_id,
        name: getServiceInstanceName(
          service,
          config.displayName,
          config.evmHomeChainId,
        ),
      });
    }

    return Array.from(groupMap.values());
  }, [services]);

  const runningServiceConfigIds = useMemo(() => {
    const set = new Set<string>();
    if (runningServiceConfigId) {
      set.add(runningServiceConfigId);
    }
    return set;
  }, [runningServiceConfigId]);

  // If selected instance is not in any group, select the first available
  useEffect(() => {
    if (!services?.length) return;
    if (!selectedServiceConfigId) return;

    const isSelectedAvailable = agentGroups.some((group) =>
      group.instances.some(
        (instance) => instance.serviceConfigId === selectedServiceConfigId,
      ),
    );
    if (isSelectedAvailable) return;

    const firstInstance = agentGroups[0]?.instances[0];
    if (firstInstance) {
      updateSelectedInstance(firstInstance.serviceConfigId);
    }
  }, [agentGroups, selectedServiceConfigId, services, updateSelectedInstance]);

  const handleInstanceSelect = useCallback(
    (serviceConfigId: string) => {
      updateSelectedInstance(serviceConfigId);

      const service = services?.find(
        (service) => service.service_config_id === serviceConfigId,
      );
      if (!service) return;

      const chainId = asEvmChainId(service.home_chain);
      const isSafeCreated = masterSafes?.some(
        (safe) => safe.evmChainId === chainId,
      );

      if (isSafeCreated) {
        gotoPage(PAGES.Main);
      } else {
        gotoPage(PAGES.Setup);
        gotoSetup(SETUP_SCREEN.FundYourAgent);
      }
    },
    [updateSelectedInstance, services, masterSafes, gotoPage, gotoSetup],
  );

  const handleBottomMenuClick = useCallback<NonNullable<MenuProps['onClick']>>(
    ({ key }) => gotoPage(key as Pages),
    [gotoPage],
  );

  const selectedBottomMenuKey = useMemo(() => {
    if (bottomMenuItems.find((item) => item?.key === pageState)) {
      return [pageState];
    }
    return selectedServiceConfigId ? [selectedServiceConfigId] : [];
  }, [pageState, selectedServiceConfigId]);

  return (
    <SiderContainer>
      <Sider breakpoint={SIDEBAR_BREAKPOINT} theme="light" width={SIDER_WIDTH}>
        <Flex
          vertical
          flex={1}
          justify="space-between"
          style={{ height: '100%' }}
        >
          <Flex vertical style={{ flex: 1, minHeight: 0 }}>
            <div className="p-16">
              <MyAgentsHeader />
              <Flex justify="space-between" align="center" className="mb-16">
                <Text
                  className="font-weight-600"
                  style={{ fontSize: 16, lineHeight: '24px' }}
                >
                  My agents
                </Text>
                <AutoRunControl />
              </Flex>
            </div>

            <AgentListScrollArea className="px-16">
              {isLoading || isMasterWalletLoading ? (
                <AgentMenuLoading />
              ) : agentGroups.length > 0 ? (
                <AgentTreeMenu
                  groups={agentGroups}
                  selectedServiceConfigId={selectedServiceConfigId}
                  runningServiceConfigIds={runningServiceConfigIds}
                  onGroupSelect={updateSelectedInstance}
                  onInstanceSelect={handleInstanceSelect}
                />
              ) : null}

              <ResponsiveButton
                size="large"
                className="flex mx-auto mt-16 w-full"
                onClick={() => {
                  gotoPage(PAGES.Setup);
                  gotoSetup(SETUP_SCREEN.AgentOnboarding);
                }}
                icon={<TbPlus size={20} />}
              >
                Add Agent
              </ResponsiveButton>
            </AgentListScrollArea>
          </Flex>

          <div className="p-16">
            <BackupSeedPhraseAlert />
            <UpdateAvailableAlert />
            <UpdateAvailableModal />

            <Menu
              selectedKeys={selectedBottomMenuKey}
              mode="inline"
              inlineIndent={12}
              onClick={handleBottomMenuClick}
              items={bottomMenuItems}
            />
          </div>
        </Flex>
      </Sider>
    </SiderContainer>
  );
};
