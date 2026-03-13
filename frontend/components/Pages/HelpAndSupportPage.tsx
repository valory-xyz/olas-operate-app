import { Button, Card, Flex, Typography } from 'antd';
import { useMemo } from 'react';
import { FiArrowUpRight, FiExternalLink } from 'react-icons/fi';

import { COLOR } from '@/constants/colors';
import { PAGES } from '@/constants/pages';
import { FAQ_URL, SUPPORT_URL } from '@/constants/urls';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useElectronApi, usePageState } from '@/hooks';

import { ExportLogsButton } from '../ExportLogsButton';
import { CardSection, cardStyles } from '../ui';

const { Title, Paragraph } = Typography;

type HelpItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  isExternal?: boolean;
  hideIcon?: boolean;
};

export const HelpAndSupport = () => {
  const { toggleSupportModal } = useSupportModal();
  const { termsAndConditionsWindow } = useElectronApi();
  const { goto } = usePageState();

  const helpItems: HelpItem[] = useMemo(
    () => [
      {
        label: 'Release notes',
        onClick: () => goto(PAGES.ReleaseNotes),
        hideIcon: true,
      },
      {
        label: 'Olas community on Telegram',
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
    ],
    [goto, termsAndConditionsWindow],
  );

  return (
    <Flex style={cardStyles} vertical gap={16}>
      <Title level={3} className="m-0 mb-16">
        Help Center
      </Title>
      <Card styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}>
        {helpItems.map(
          ({ label, href, onClick, isExternal, hideIcon }, index) => (
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
                    {!hideIcon &&
                      (isExternal ? (
                        <FiExternalLink color={COLOR.PURPLE} fontSize={20} />
                      ) : (
                        <FiArrowUpRight color={COLOR.PURPLE} fontSize={20} />
                      ))}
                  </Flex>
                </a>
              ) : null}
            </CardSection>
          ),
        )}
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
