import { QuestionCircleOutlined } from '@ant-design/icons';
import { Card, Flex, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import {
  FAQ_URL,
  GITHUB_API_LATEST_RELEASE,
  GITHUB_API_RELEASES,
  SUPPORT_URL,
  TERMS_AND_CONDITIONS_URL,
} from '@/constants/urls';
import { usePageState } from '@/hooks/usePageState';

import { CardTitle } from '../Card/CardTitle';
import { ExportLogsButton } from '../ExportLogsButton';
import { CardSection } from '../styled/CardSection';
import { GoToLoginPageButton } from './GoToLoginPageButton';
import { GoToMainPageButton } from './GoToMainPageButton';

const { Title, Paragraph } = Typography;

const SettingsTitle = () => (
  <CardTitle
    title={
      <Flex gap={10}>
        <QuestionCircleOutlined />
        Help & support
      </Flex>
    }
  />
);

export const HelpAndSupport = () => {
  const { isUserLoggedIn } = usePageState();
  const [latestTag, setLatestTag] = useState<string | null>(null);

  useEffect(() => {
    const getTag = async () => {
      const response = await fetch(GITHUB_API_LATEST_RELEASE);
      if (!response.ok) return null;

      const data = await response.json();
      return data.tag_name;
    };

    getTag().then((tag) => {
      setLatestTag(tag);
    });
  }, []);

  return (
    <Card
      title={<SettingsTitle />}
      bordered={false}
      styles={{ body: { paddingTop: 0, paddingBottom: 0 } }}
      extra={isUserLoggedIn ? <GoToMainPageButton /> : <GoToLoginPageButton />}
    >
      <CardSection $borderBottom $padding="16px 24px 24px" vertical>
        <Title level={5} className="m-0 mb-16 text-base">
          Frequently asked questions
        </Title>
        <a target="_blank" href={FAQ_URL} className="mb-8">
          Read FAQ {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
        {latestTag && (
          <a
            href={`${GITHUB_API_RELEASES}/tag/${latestTag}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-8"
          >
            Release notes {UNICODE_SYMBOLS.EXTERNAL_LINK}
          </a>
        )}
        <a target="_blank" href={TERMS_AND_CONDITIONS_URL}>
          Terms and Conditions {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
      </CardSection>

      <CardSection $borderBottom $padding="16px 24px 24px" vertical>
        <Title level={5} className="m-0 mb-8 text-base">
          Ask for help
        </Title>
        <Paragraph type="secondary" className="mb-16 text-sm">
          Get your questions answered by the community.
        </Paragraph>
        <a target="_blank" href={SUPPORT_URL}>
          Olas community Discord server {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
      </CardSection>

      <CardSection padding="16px 24px 24px" vertical align="start">
        <Title level={5} className="m-0 mb-16 text-base ">
          Export logs for troubleshooting
        </Title>
        <ExportLogsButton />
      </CardSection>
    </Card>
  );
};
