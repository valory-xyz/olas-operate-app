import {
  Button,
  Dropdown,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TbDots,
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
  COLOR,
  EvmChainId,
  PAGES,
  Pages,
  SETUP_SCREEN,
  SIDER_WIDTH,
} from '@/constants';
import {
  useAgentRunning,
  useArchivedAgents,
  useBalanceAndRefillRequirementsContext,
  useMasterWalletContext,
  usePageState,
  useServices,
  useSetup,
} from '@/hooks';

import { BackupSeedPhraseAlert } from '../BackupSeedPhraseAlert';
import { UpdateAvailableAlert } from '../UpdateAvailableAlert/UpdateAvailableAlert';
import { UpdateAvailableModal } from '../UpdateAvailableAlert/UpdateAvailableModal';
import { ArchiveAgentModal } from './ArchiveAgentModal';
import { AutoRunControl } from './AutoRunControl';
import { PulseDot } from './PulseDot';

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

/** Hidden by default; revealed when parent menu item is hovered. */
const ArchiveMenuButton = styled.span`
  visibility: hidden;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  border-radius: 4px;
  color: ${COLOR.TEXT_NEUTRAL_SECONDARY};
  .ant-menu-item:hover & {
    visibility: visible;
  }
  &:hover {
    color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
    background-color: ${COLOR.GRAY_3};
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
  onArchiveRequest: (agentType: AgentType) => void;
};

const AgentListMenu = ({
  myAgents,
  selectedMenuKeys,
  onAgentSelect,
  onArchiveRequest,
}: AgentListMenuProps) => {
  const { runningAgentType } = useAgentRunning();
  const canShowArchiveMenu = myAgents.length > 1;

  return (
    <Menu
      selectedKeys={selectedMenuKeys}
      mode="inline"
      inlineIndent={4}
      onClick={onAgentSelect}
      items={myAgents.map((agent) => {
        const isRunning = runningAgentType === agent.agentType;
        const showArchiveButton = canShowArchiveMenu && !isRunning;

        return {
          key: agent.agentType,
          className: isRunning ? 'menu-running-agent' : undefined,
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
              {isRunning ? (
                <PulseDot />
              ) : showArchiveButton ? (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      {
                        key: 'archive',
                        label: 'Move to archive',
                        onClick: ({ domEvent }) => {
                          domEvent.stopPropagation();
                          onArchiveRequest(agent.agentType);
                        },
                      },
                    ],
                  }}
                >
                  <ArchiveMenuButton
                    role="button"
                    aria-label={`Archive ${agent.name}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TbDots size={16} />
                  </ArchiveMenuButton>
                </Dropdown>
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
        };
      })}
    />
  );
};

export const Sidebar = () => {
  const { goto: gotoSetup } = useSetup();
  const { pageState, goto: gotoPage } = usePageState();
  const { services, isLoading, selectedAgentType, updateAgentType } =
    useServices();
  const { archiveAgent, archivedAgents } = useArchivedAgents();

  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();

  const [pendingArchiveAgent, setPendingArchiveAgent] = useState<
    AgentType | undefined
  >();

  // Optimistic exclusion: immediately hide an agent when archiving is confirmed,
  // before the IPC store-changed response arrives. Cleared once the store catches up.
  const [optimisticArchivedAgents, setOptimisticArchivedAgents] = useState<
    AgentType[]
  >([]);

  useEffect(() => {
    setOptimisticArchivedAgents((prev) =>
      prev.filter((a) => !archivedAgents.includes(a)),
    );
  }, [archivedAgents]);

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
      if (
        archivedAgents.includes(agentType) ||
        optimisticArchivedAgents.includes(agentType)
      )
        return result;

      const chainId = agentConfig.evmHomeChainId;
      const chainName = CHAIN_CONFIG[chainId].name;
      const name = agentConfig.displayName;
      result.push({ name, agentType, chainName, chainId });
      return result;
    }, []);
  }, [services, archivedAgents, optimisticArchivedAgents]);

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
    if (archivedAgents.length > 0) return true;

    const availableAgents = myAgents.filter((agent) => {
      return AVAILABLE_FOR_ADDING_AGENTS.some(
        ([agentType]) => agentType === agent.agentType,
      );
    });

    return availableAgents.length < AVAILABLE_FOR_ADDING_AGENTS.length;
  }, [myAgents, archivedAgents]);

  const handleArchiveConfirm = useCallback(() => {
    if (!pendingArchiveAgent) return;

    // Optimistically hide immediately — before IPC round-trip completes
    setOptimisticArchivedAgents((prev) => [...prev, pendingArchiveAgent]);
    archiveAgent(pendingArchiveAgent);

    // Select next available agent if the archived one was selected
    if (selectedAgentType === pendingArchiveAgent) {
      const nextAgent = myAgents.find(
        (agent) => agent.agentType !== pendingArchiveAgent,
      );
      if (nextAgent) {
        updateAgentType(nextAgent.agentType);
        gotoPage(PAGES.Main);
      } else {
        gotoPage(PAGES.Setup);
        gotoSetup(SETUP_SCREEN.AgentOnboarding);
      }
    }

    setPendingArchiveAgent(undefined);
  }, [
    archiveAgent,
    gotoPage,
    gotoSetup,
    myAgents,
    pendingArchiveAgent,
    selectedAgentType,
    updateAgentType,
  ]);

  const pendingArchiveAgentName = useMemo(() => {
    if (!pendingArchiveAgent) return '';
    const agent = myAgents.find((a) => a.agentType === pendingArchiveAgent);
    return agent?.name ?? '';
  }, [myAgents, pendingArchiveAgent]);

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
