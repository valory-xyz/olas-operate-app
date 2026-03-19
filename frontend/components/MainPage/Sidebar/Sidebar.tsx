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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useIsInitiallyFunded,
  useMasterWalletContext,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';
import { getServiceInstanceName } from '@/utils';

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

const AgentListScrollArea = styled.div<{
  $fadeTop: boolean;
  $fadeBottom: boolean;
}>`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  mask-image: linear-gradient(
    to bottom,
    ${({ $fadeTop }) => ($fadeTop ? 'transparent' : 'black')} 0%,
    black 16px,
    black calc(100% - 16px),
    ${({ $fadeBottom }) => ($fadeBottom ? 'transparent' : 'black')} 100%
  );
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
    getAgentTypeFromService,
  } = useServices();
  const { runningServiceConfigId } = useAgentRunning();
  const { isLoading: isMasterWalletLoading } = useMasterWalletContext();

  const [fade, setFade] = useState({ top: false, bottom: false });
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const updateFade = useCallback(() => {
    const node = scrollAreaRef.current;
    if (!node) return;

    const { scrollTop, scrollHeight, clientHeight } = node;
    setFade({
      top: scrollTop > 0,
      bottom: scrollTop + clientHeight < scrollHeight - 1,
    });
  }, []);

  useEffect(() => {
    const node = scrollAreaRef.current;
    if (!node) return;

    const observer = new ResizeObserver(updateFade);
    observer.observe(node);
    node.addEventListener('scroll', updateFade);

    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', updateFade);
    };
  }, [updateFade]);

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

    // Sort instances within each group by service config ID (lexicographic)
    for (const group of groupMap.values()) {
      group.instances.sort((a, b) =>
        a.serviceConfigId.localeCompare(b.serviceConfigId),
      );
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

  const { isInstanceInitiallyFunded } = useIsInitiallyFunded();

  const handleInstanceSelect = useCallback(
    (serviceConfigId: string) => {
      updateSelectedInstance(serviceConfigId);

      const agentType = getAgentTypeFromService(serviceConfigId);
      if (
        !agentType ||
        !isInstanceInitiallyFunded(serviceConfigId, agentType)
      ) {
        gotoPage(PAGES.Setup);
        gotoSetup(SETUP_SCREEN.FundYourAgent);
      } else {
        gotoPage(PAGES.Main);
      }
    },
    [
      updateSelectedInstance,
      gotoPage,
      gotoSetup,
      getAgentTypeFromService,
      isInstanceInitiallyFunded,
    ],
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
          <Flex vertical style={{ overflow: 'hidden' }}>
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

            <AgentListScrollArea
              ref={scrollAreaRef}
              $fadeTop={fade.top}
              $fadeBottom={fade.bottom}
              className="px-16"
            >
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
            </AgentListScrollArea>

            <div className="px-16 mt-16">
              <ResponsiveButton
                size="large"
                className="flex mx-auto w-full"
                onClick={() => {
                  gotoPage(PAGES.Setup);
                  gotoSetup(SETUP_SCREEN.AgentOnboarding);
                }}
                icon={<TbPlus size={20} />}
              >
                Add Agent
              </ResponsiveButton>
            </div>
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
