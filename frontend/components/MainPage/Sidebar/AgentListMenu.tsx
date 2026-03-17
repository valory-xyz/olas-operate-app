import { Dropdown, Flex, Menu, MenuProps } from 'antd';
import { kebabCase } from 'lodash';
import Image from 'next/image';
import { TbDots } from 'react-icons/tb';
import styled from 'styled-components';

import { AgentType, COLOR, EvmChainId, Pages } from '@/constants';
import { useAgentRunning } from '@/hooks';

import { PulseDot } from './PulseDot';

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

export type AgentList = {
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

export const AgentListMenu = ({
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
