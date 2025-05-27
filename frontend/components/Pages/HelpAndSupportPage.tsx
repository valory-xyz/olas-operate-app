import { QuestionCircleOutlined } from '@ant-design/icons';
import { Card, Flex, Typography } from 'antd';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import {
  FAQ_URL,
  SUPPORT_URL,
  TERMS_AND_CONDITIONS_URL,
} from '@/constants/urls';

import { CardTitle } from '../Card/CardTitle';
import { ExportLogsButton } from '../ExportLogsButton';
import { CardSection } from '../styled/CardSection';
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
  return (
    <Card
      title={<SettingsTitle />}
      bordered={false}
      styles={{
        body: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
      extra={<GoToMainPageButton />}
    >
      <CardSection $borderBottom $padding="16px 24px 24px" vertical>
        <Title level={5} className="m-0 mb-16 text-base">
          Frequently asked questions
        </Title>
        <a target="_blank" href={FAQ_URL} className="mb-8">
          Read FAQ {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </a>
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
