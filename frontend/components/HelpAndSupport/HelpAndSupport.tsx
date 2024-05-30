import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Card, Flex, message, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { FAQ_URL, SUPPORT_URL } from '@/constants';
import { UNICODE_SYMBOLS } from '@/constants/unicode';
import { PageState } from '@/enums';
import { useLogs, usePageState } from '@/hooks';
import { useElectronApi } from '@/hooks/useElectronApi';

import { CardTitle } from '../common/CardTitle';
import { CardSection } from '../styled/CardSection';

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
  const { goto } = usePageState();
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
      extra={
        <Button
          size="large"
          icon={<CloseOutlined />}
          onClick={() => goto(PageState.Main)}
        />
      }
    >
      <CardSection borderbottom="true" padding="16px 24px 24px" vertical>
        <Title level={5} className="m-0 mb-16 text-base">
          Frequently asked questions
        </Title>
        <a target="_blank" href={FAQ_URL}>
          Read FAQ {UNICODE_SYMBOLS.EXTERNAL_LINK}
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
