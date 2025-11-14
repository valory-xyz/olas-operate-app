import { Button, Card, Flex, Typography } from 'antd';
import { compact } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import { FiArrowUpRight, FiExternalLink } from 'react-icons/fi';
import { useIsMounted } from 'usehooks-ts';

import { COLOR } from '@/constants/colors';
import { FAQ_URL, GITHUB_API_RELEASES, SUPPORT_URL } from '@/constants/urls';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useElectronApi } from '@/hooks';

import { ExportLogsButton } from '../ExportLogsButton';
import { CardSection, cardStyles } from '../ui';

const { Title, Paragraph } = Typography;

type HelpItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  isExternal?: boolean;
};

export const HelpAndSupport = () => {
  const [latestTag, setLatestTag] = useState<string | null>(null);

  const { toggleSupportModal } = useSupportModal();
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
          label: `Olas DAO's Discord server`,
          href: SUPPORT_URL,
          isExternal: true,
        },
        {
          label: 'Frequently asked questions',
          href: FAQ_URL,
          isExternal: false,
        },
        {
          label: 'Pearl Terms',
          onClick: () => termsAndConditionsWindow?.show?.(),
        },
      ]),
    [latestTag, termsAndConditionsWindow],
  );

  return (
    <Flex style={cardStyles} vertical gap={16}>
      <Title level={3} className="m-0 mb-16">
        Help Center
      </Title>
      <Card styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}>
        {helpItems.map(({ label, href, onClick, isExternal }, index) => (
          <CardSection
            key={index}
            $borderBottom={index !== helpItems.length - 1}
            $padding="16px"
            vertical
          >
            {href || onClick ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClick}
              >
                <Flex justify="space-between" align="center">
                  {label}
                  {isExternal ? (
                    <FiExternalLink color={COLOR.PURPLE} fontSize={20} />
                  ) : (
                    <FiArrowUpRight color={COLOR.PURPLE} fontSize={20} />
                  )}
                </Flex>
              </a>
            ) : null}
          </CardSection>
        ))}
      </Card>

      <Card styles={{ body: { padding: 16 } }}>
        <Flex justify="space-between" align="center">
          <Paragraph type="secondary" className="mb-0 text-sm">
            Ask for help or export logs for troubleshooting
          </Paragraph>
          <Flex gap={8}>
            <Button onClick={() => toggleSupportModal()}>
              Contact support
            </Button>
            <ExportLogsButton />
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
