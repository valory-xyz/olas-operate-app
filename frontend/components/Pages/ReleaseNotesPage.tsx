import { Card, Flex, Tag, Tooltip, Typography } from 'antd';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { useIsMounted } from 'usehooks-ts';

import { AGENT_CONFIG } from '@/config/agents';
import { COLOR, PAGES } from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { GITHUB_API_RELEASES, IPFS_GATEWAY_URL } from '@/constants/urls';
import { useElectronApi, usePageState } from '@/hooks';

import { BackButton, CardSection, cardStyles } from '../ui';

const { Title, Text } = Typography;

const VersionBadge = ({ href, version }: { href: string; version: string }) => (
  <Tooltip title="View release notes">
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Tag
        color="purple"
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {version}
        <FiExternalLink size={12} />
      </Tag>
    </a>
  </Tooltip>
);

const AgentHashLink = ({ href }: { href: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: COLOR.PURPLE,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}
  >
    <Text style={{ color: COLOR.PURPLE }}>Agent hash</Text>
    <FiExternalLink size={14} color={COLOR.PURPLE} />
  </a>
);

export const ReleaseNotesPage = () => {
  const [latestTag, setLatestTag] = useState<string | null>(null);
  const { getAppVersion } = useElectronApi();
  const { goto } = usePageState();
  const isMounted = useIsMounted();

  useEffect(() => {
    const getTag = async () => {
      if (typeof getAppVersion !== 'function') return;
      try {
        const version = await getAppVersion();
        if (version && isMounted()) {
          setLatestTag(version);
        }
      } catch (error) {
        console.error('Failed to get app version:', error);
      }
    };
    getTag();
  }, [getAppVersion, isMounted]);

  // Deduplicate by agentType - one row per agent type
  const agentRows = SERVICE_TEMPLATES.filter((template, index, arr) => {
    const config = AGENT_CONFIG[template.agentType];
    return (
      config?.isAgentEnabled &&
      arr.findIndex((t) => t.agentType === template.agentType) === index
    );
  });

  return (
    <Flex style={cardStyles} vertical gap={16}>
      <BackButton onPrev={() => goto(PAGES.HelpAndSupport)} />

      <Title level={3} className="m-0">
        Release Notes
      </Title>

      <Card styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}>
        {/* Pearl row */}
        {latestTag && (
          <CardSection
            $padding="12px 16px"
            $borderBottom={agentRows.length > 0}
            align="center"
            justify="space-between"
          >
            <Flex align="center" gap={12}>
              <Image
                src="/pearl-with-gradient.png"
                alt="Pearl"
                width={32}
                height={32}
                style={{ borderRadius: 4 }}
              />
              <Text strong>Pearl</Text>
            </Flex>
            <VersionBadge
              href={`${GITHUB_API_RELEASES}/tag/v${latestTag}`}
              version={`v${latestTag}`}
            />
          </CardSection>
        )}

        {/* Agent rows */}
        {agentRows.map((template, index) => {
          const config = AGENT_CONFIG[template.agentType];
          const { owner, name, version } = template.agent_release.repository;
          const releaseUrl = `https://github.com/${owner}/${name}/releases/tag/${version}`;
          const ipfsUrl = `${IPFS_GATEWAY_URL}${template.hash}`;

          return (
            <CardSection
              key={template.agentType}
              $padding="12px 16px"
              $borderBottom={index < agentRows.length - 1}
              align="center"
              justify="space-between"
            >
              <Flex align="center" gap={12}>
                <Image
                  src={`/agent-${template.agentType}-icon.png`}
                  alt={config.displayName}
                  width={32}
                  height={32}
                  style={{ borderRadius: 4 }}
                />
                <Text strong>{config.displayName}</Text>
              </Flex>
              <Flex align="center" gap={12}>
                <AgentHashLink href={ipfsUrl} />
                <VersionBadge href={releaseUrl} version={version} />
              </Flex>
            </CardSection>
          );
        })}
      </Card>
    </Flex>
  );
};
