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
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TbHelpSquareRounded,
  TbPlus,
  TbSettings,
  TbWallet,
} from 'react-icons/tb';
import styled from 'styled-components';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
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
  useAllInstancesRewardStatus,
  useBalanceAndRefillRequirementsContext,
  useElectronApi,
  useIsInitiallyFunded,
  useMasterWalletContext,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';
import {
  getServiceInstanceName,
  isServiceOfAgent,
  sortByCreationTime,
} from '@/utils';

import { BackupSeedPhraseAlert } from '../BackupSeedPhraseAlert';
import { useSidebarAgents } from '../hooks/useSidebarAgents';
import { UpdateAvailableAlert } from '../UpdateAvailableAlert/UpdateAvailableAlert';
import { UpdateAvailableModal } from '../UpdateAvailableAlert/UpdateAvailableModal';
import { AgentTreeMenu } from './AgentTreeMenu';
import { ArchiveAgentModal } from './ArchiveAgentModal';
import { AutoRunControl } from './AutoRunControl';
import { useAutoOpenUpdateModal } from './hooks/useAutoOpenUpdateModal';
import { useListFade } from './hooks/useListFade';
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
    updateSelectedServiceConfigId,
    getAgentTypeFromService,
  } = useServices();
  const { isLoading: isMasterWalletLoading } = useMasterWalletContext();
  const { fade, ref: scrollAreaRef } = useListFade();

  const {
    isOpen: isUpdateModalOpen,
    open: openUpdateModal,
    close: closeUpdateModal,
  } = useAutoOpenUpdateModal();

  // Temporary: show app version in sidebar for OTA testing
  const { getAppVersion } = useElectronApi();
  const [appVersion, setAppVersion] = useState<string>();
  useEffect(() => {
    getAppVersion?.().then(setAppVersion).catch(() => {});
  }, [getAppVersion]);

  const {
    pendingArchiveInstanceId,
    setPendingArchiveInstanceId,
    pendingArchiveInstanceName,
    handleArchiveConfirm,
    archivedInstances,
  } = useSidebarAgents();

  const rewardStatusByConfigId = useAllInstancesRewardStatus();

  const agentGroups = useMemo<SidebarAgentGroup[]>(() => {
    if (!services) return [];

    const groupMap = new Map<AgentType, SidebarAgentGroup>();

    // Sort services by creation time first so instances are inserted in order
    const sorted = [...services].sort(sortByCreationTime);

    for (const service of sorted) {
      const agentEntry = ACTIVE_AGENTS.find(([, config]) =>
        isServiceOfAgent(service, config),
      );
      if (!agentEntry) continue;

      const [agentType, config] = agentEntry;

      // Hide archived instances from the sidebar
      if (archivedInstances.includes(service.service_config_id)) continue;

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
        hasEarnedRewards: rewardStatusByConfigId.get(service.service_config_id),
      });
    }

    // Sort groups: active agents in ACTIVE_AGENTS config order,
    // under-construction agents at the end.
    const isUnderConstruction = (type: AgentType) =>
      AGENT_CONFIG[type]?.isUnderConstruction ?? false;
    const configIndex = (type: AgentType) =>
      ACTIVE_AGENTS.findIndex(([t]) => t === type);

    return Array.from(groupMap.values()).sort((a, b) => {
      if (
        isUnderConstruction(a.agentType) !== isUnderConstruction(b.agentType)
      ) {
        return isUnderConstruction(a.agentType) ? 1 : -1;
      }
      return configIndex(a.agentType) - configIndex(b.agentType);
    });
  }, [services, archivedInstances, rewardStatusByConfigId]);

  const { runningServiceConfigId } = useAgentRunning();

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
      updateSelectedServiceConfigId(firstInstance.serviceConfigId);
    }
  }, [
    agentGroups,
    selectedServiceConfigId,
    services,
    updateSelectedServiceConfigId,
  ]);

  const { isInstanceInitiallyFunded } = useIsInitiallyFunded();

  const handleInstanceSelect = useCallback(
    (serviceConfigId: string) => {
      updateSelectedServiceConfigId(serviceConfigId);

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
      updateSelectedServiceConfigId,
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
                  totalInstanceCount={agentGroups.reduce(
                    (sum, g) => sum + g.instances.length,
                    0,
                  )}
                  onGroupSelect={handleInstanceSelect}
                  onInstanceSelect={handleInstanceSelect}
                  onArchiveRequest={setPendingArchiveInstanceId}
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
            <UpdateAvailableAlert onOpen={openUpdateModal} />
            <UpdateAvailableModal
              isOpen={isUpdateModalOpen}
              onClose={closeUpdateModal}
            />

            <Menu
              selectedKeys={selectedBottomMenuKey}
              mode="inline"
              inlineIndent={12}
              onClick={handleBottomMenuClick}
              items={bottomMenuItems}
            />
            {appVersion && (
              <Text
                type="secondary"
                style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 8 }}
              >
                v{appVersion}
              </Text>
            )}
          </div>
        </Flex>
      </Sider>

      <ArchiveAgentModal
        agentName={pendingArchiveInstanceName}
        open={!!pendingArchiveInstanceId}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setPendingArchiveInstanceId(undefined)}
      />
    </SiderContainer>
  );
};
