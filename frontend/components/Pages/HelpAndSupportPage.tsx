import { Card, Flex, Typography } from 'antd';
import { compact } from 'lodash';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { FiArrowUpRight, FiExternalLink } from 'react-icons/fi';
import { useIsMounted } from 'usehooks-ts';

import { COLOR } from '@/constants/colors';
import { FAQ_URL, GITHUB_API_RELEASES, SUPPORT_URL } from '@/constants/urls';
import { useElectronApi } from '@/hooks/useElectronApi';

import { ExportLogsButton } from '../ExportLogsButton';
import { CardSection, cardStyles } from '../ui';

const { Title, Paragraph } = Typography;

type HelpItem = {
  label: string;
  href?: string;
  action?: ReactNode;
  isExternal?: boolean;
};

export const HelpAndSupport = () => {
  const [latestTag, setLatestTag] = useState<string | null>(null);
  const { getAppVersion, termsAndConditionsWindow } = useElectronApi();
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

  const helpItems: HelpItem[] = useMemo(
    () =>
      compact([
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
          action: (
            <a onClick={() => termsAndConditionsWindow?.show?.('pearl')}>
              Terms and Conditions
            </a>
          ),
        },
      ]),
    [latestTag, termsAndConditionsWindow],
  );

  return (
    <Flex style={cardStyles} vertical gap={16}>
      <Title level={3}>Help Center</Title>
      <Card styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}>
        {helpItems.map(({ label, href, action, isExternal }, index) => (
          <CardSection
            key={index}
            $borderBottom={index !== helpItems.length - 1}
            $padding="16px"
            vertical
          >
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                <Flex justify="space-between" align="center">
                  {label}
                  {isExternal ? (
                    <FiExternalLink color={COLOR.PURPLE} fontSize={20} />
                  ) : (
                    <FiArrowUpRight color={COLOR.PURPLE} fontSize={20} />
                  )}
                </Flex>
              </a>
            ) : action ? (
              action
            ) : null}
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
    </Flex>
  );
};
