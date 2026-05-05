import { Card, Flex, Tag, Tooltip, Typography } from 'antd';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import styled, { css } from 'styled-components';
import { useIsMounted } from 'usehooks-ts';

import { ACTIVE_AGENTS } from '@/config/agents';
import {
  AgentType,
  COLOR,
  GITHUB_API_RELEASES,
  IPFS_GATEWAY_URL,
  PAGES,
} from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useElectronApi, usePageState, useServices } from '@/hooks';

import { BackButton, cardStyles } from '../ui';

const { Title, Text } = Typography;

const ReleaseNotesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
`;

const cellBase = css<{ $hasBorder?: boolean; $justifyContent?: string }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $justifyContent }) => $justifyContent || 'flex-start'};
  min-height: 60px;
  padding: 12px 16px;
  ${({ $hasBorder }) =>
    $hasBorder ? `border-bottom: 1px solid ${COLOR.BORDER_GRAY};` : ''}
`;

const NameCell = styled.div<{ $hasBorder?: boolean }>`
  ${cellBase}
  gap: 12px;
`;

const ActionCell = styled.div<{
  $hasBorder?: boolean;
  $justifyContent?: string;
}>`
  ${cellBase}
`;

const AgentIconWrapper = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
`;

const VersionTag = styled(Tag)`
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
`;

const Row = styled.div`
  display: contents;
`;

const AgentHashAnchor = styled.a`
  color: ${COLOR.PURPLE};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
`;

const VersionBadge = ({ href, version }: { href: string; version: string }) => (
  <Tooltip title="View release notes">
    <a href={href} target="_blank" rel="noopener noreferrer">
      <VersionTag color="purple" bordered={false}>
        {version}
        <FiExternalLink size={12} />
      </VersionTag>
    </a>
  </Tooltip>
);

const AgentHashLink = ({ href }: { href: string }) => (
  <AgentHashAnchor href={href} target="_blank" rel="noopener noreferrer">
    <Text style={{ color: COLOR.PURPLE }}>Agent hash</Text>
    <FiExternalLink size={14} color={COLOR.PURPLE} />
  </AgentHashAnchor>
);

export const ReleaseNotesPage = () => {
  const [latestTag, setLatestTag] = useState<string | null>(null);
  const { getAppVersion } = useElectronApi();
  const { goto } = usePageState();
  const { services } = useServices();
  const isMounted = useIsMounted();

  useEffect(() => {
    const getTag = async () => {
      if (typeof getAppVersion !== 'function') return;
      try {
        const version = await getAppVersion();
        if (version && isMounted()) setLatestTag(version);
      } catch (error) {
        console.error('Failed to get app version:', error);
      }
    };
    getTag();
  }, [getAppVersion, isMounted]);

  const configuredAgents = useMemo(() => {
    if (!services) return null;
    const types = new Set<AgentType>();
    services.forEach((service) => {
      const agent = ACTIVE_AGENTS.find(
        ([, agentConfig]) =>
          agentConfig.servicePublicId === service.service_public_id &&
          agentConfig.middlewareHomeChainId === service.home_chain,
      );
      if (agent) types.add(agent[0]);
    });
    return types;
  }, [services]);

  const agentRows = useMemo(() => {
    if (!configuredAgents) return [];
    return SERVICE_TEMPLATES.filter((template) =>
      configuredAgents.has(template.agentType),
    ).flatMap((template) => {
      const agent = ACTIVE_AGENTS.find(
        ([agentType]) => agentType === template.agentType,
      );
      if (!agent) return [];
      const { displayName } = agent[1];
      const { owner, name, version } = template.agent_release.repository;
      return [
        {
          agentType: template.agentType,
          displayName,
          releaseUrl: `https://github.com/${owner}/${name}/releases/tag/${version}`,
          ipfsUrl: `${IPFS_GATEWAY_URL}${template.hash}`,
          version,
        },
      ];
    });
  }, [configuredAgents]);

  return (
    <Flex style={cardStyles} vertical gap={16}>
      <BackButton onPrev={() => goto(PAGES.HelpAndSupport)} />

      <Title level={3} className="m-0">
        Release Notes
      </Title>

      <Card styles={{ body: { padding: 0 } }}>
        <ReleaseNotesGrid>
          {/* Pearl row */}
          {latestTag && (
            <Row key="pearl">
              <NameCell $hasBorder={agentRows.length > 0}>
                <AgentIconWrapper>
                  <Image
                    src="/pearl-with-gradient.png"
                    alt="Pearl"
                    width={32}
                    height={32}
                  />
                </AgentIconWrapper>
                <Text strong>Pearl</Text>
              </NameCell>

              <ActionCell $hasBorder={agentRows.length > 0} />

              <ActionCell $hasBorder={agentRows.length > 0}>
                <VersionBadge
                  href={`${GITHUB_API_RELEASES}/tag/v${latestTag}`}
                  version={`v${latestTag}`}
                />
              </ActionCell>
            </Row>
          )}

          {/* Agent rows */}
          {agentRows.map(
            (
              { agentType, displayName, releaseUrl, ipfsUrl, version },
              index,
            ) => {
              const hasBorder = index < agentRows.length - 1;
              return (
                <Row key={agentType}>
                  <NameCell $hasBorder={hasBorder}>
                    <AgentIconWrapper>
                      <Image
                        src={`/agent-${agentType}-icon.png`}
                        alt={displayName}
                        width={32}
                        height={32}
                      />
                    </AgentIconWrapper>
                    <Text strong>{displayName}</Text>
                  </NameCell>

                  <ActionCell $hasBorder={hasBorder}>
                    <AgentHashLink href={ipfsUrl} />
                  </ActionCell>

                  <ActionCell $hasBorder={hasBorder} $justifyContent="flex-end">
                    <VersionBadge href={releaseUrl} version={version} />
                  </ActionCell>
                </Row>
              );
            },
          )}
        </ReleaseNotesGrid>
      </Card>
    </Flex>
  );
};
