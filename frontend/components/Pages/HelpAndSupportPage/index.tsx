import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Card, Flex, message, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import {
  FAQ_URL,
  SUPPORT_URL,
  TERMS_AND_CONDITIONS_URL,
} from '@/constants/urls';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useLogs } from '@/hooks/useLogs';

import { CardTitle } from '../../Card/CardTitle';
import { CardSection } from '../../styled/CardSection';
import { GoToMainPageButton } from '../GoToMainPageButton';

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

const LogsSavedMessage = ({ onClick }: { onClick: () => void }) => {
  return (
    <span>
      Logs saved
      <Button type="link" size="small" onClick={onClick}>
        Open folder
      </Button>
    </span>
  );
};

export const HelpAndSupport = () => {
  const { openPath, saveLogs } = useElectronApi();

  const logs = useLogs();

  const [isLoading, setIsLoading] = useState(false);
  const [canSaveLogs, setCanSaveLogs] = useState(false);

  const onSaveLogs = useCallback(() => setCanSaveLogs(true), []);

  useEffect(() => {
    if (canSaveLogs && logs && !isLoading) {
      setIsLoading(true);
      saveLogs?.(logs)
        .then((result) => {
          if (result.success) {
            message.success({
              content: (
                <LogsSavedMessage onClick={() => openPath?.(result.dirPath)} />
              ),
              duration: 10,
            });
          } else {
            message.error('Save logs failed or cancelled');
          }
        })
        .finally(() => {
          setIsLoading(false);
          setCanSaveLogs(false);
        });
    }
  }, [canSaveLogs, isLoading, logs, openPath, saveLogs]);

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
      <CardSection borderbottom="true" padding="16px 24px 24px" vertical>
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

      <CardSection borderbottom="true" padding="16px 24px 24px" vertical>
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
        <Button
          type="primary"
          ghost
          size="large"
          loading={isLoading || canSaveLogs}
          onClick={onSaveLogs}
        >
          Export logs
        </Button>
      </CardSection>
    </Card>
  );
};
