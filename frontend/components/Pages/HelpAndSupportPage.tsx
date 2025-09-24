import { Card, Flex, Typography } from 'antd';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useIsMounted } from 'usehooks-ts';

import { COLOR } from '@/constants/colors';
import {
  FAQ_URL,
  GITHUB_API_RELEASES,
  SUPPORT_URL,
  TERMS_AND_CONDITIONS_URL,
} from '@/constants/urls';
import { useElectronApi } from '@/hooks/useElectronApi';

import { ArrowUpRightSvg, ExternalLink } from '../custom-icons';
import { ExportLogsButton } from '../ExportLogsButton';
import { CardSection } from '../ui/CardSection';

const { Title, Paragraph } = Typography;

const HelpContainer = styled.div`
  width: 552px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

type HelpItem = {
  label: string;
  href: string;
  isExternal: boolean;
};

export const HelpAndSupport = () => {
  const [latestTag, setLatestTag] = useState<string | null>(null);
  const { getAppVersion } = useElectronApi();
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

  const helpItems: HelpItem[] = [
    latestTag
      ? {
          label: 'Latest release notes',
          href: `${GITHUB_API_RELEASES}/tag/v${latestTag}`,
          isExternal: true,
        }
      : null,
    {
      label: 'Olas community Discord server',
      href: SUPPORT_URL,
      isExternal: true,
    },
    {
      label: 'Frequently asked questions',
      href: FAQ_URL,
      isExternal: false,
    },
    {
      label: 'Pearl Terms and Conditions',
      href: TERMS_AND_CONDITIONS_URL,
      isExternal: false,
    },
  ].filter(Boolean) as HelpItem[];

  return (
    <HelpContainer>
      <Title level={3}>Help Center</Title>
      <Card styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}>
        {helpItems.map(({ label, href, isExternal }, index) => (
          <CardSection
            key={index}
            $borderBottom={index !== helpItems.length - 1}
            $padding="16px"
            vertical
          >
            <a href={href} target="_blank" rel="noopener noreferrer">
              <Flex justify="space-between" align="center">
                {label}

                {isExternal ? (
                  <ExternalLink color={COLOR.PURPLE} />
                ) : (
                  <ArrowUpRightSvg fill={COLOR.PURPLE} />
                )}
              </Flex>
            </a>
          </CardSection>
        ))}
      </Card>

      <Card styles={{ body: { padding: 16 } }}>
        <Flex justify="space-between" align="center">
          <Paragraph type="secondary" className="mb-0">
            Export logs for troubleshooting
          </Paragraph>
          <ExportLogsButton />
        </Flex>
      </Card>
    </HelpContainer>
  );
};
