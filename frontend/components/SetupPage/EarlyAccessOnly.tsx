import { IdcardOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useCallback } from 'react';

import { COLOR, SETUP_SCREEN, UNICODE_SYMBOLS } from '@/constants';
import { useSetup } from '@/hooks/useSetup';

import { CardFlex } from '../ui/CardFlex';

const { Title, Paragraph } = Typography;

export const EarlyAccessOnly = () => {
  const { goto } = useSetup();

  const onGoBack = useCallback(() => {
    goto(SETUP_SCREEN.AgentOnboarding);
  }, [goto]);

  return (
    <CardFlex
      $gap={20}
      $noBorder
      styles={{ body: { padding: '24px 48px', alignItems: 'center' } }}
    >
      <IdcardOutlined style={{ fontSize: '48px', color: COLOR.TEXT_LIGHT }} />
      <Title level={3} className="m-0">
        Early access only
      </Title>
      <Paragraph className="text-center text-light m-0">
        This agent is available only to early adopters. Fill out the form to
        request access.
      </Paragraph>
      <Button
        type="link"
        href="https://mailchi.mp/a95a68faaac8/olas-mailing-list"
        target="_blank"
        rel="noopener noreferrer"
      >
        Request access&nbsp;{UNICODE_SYMBOLS.EXTERNAL_LINK}
      </Button>
      <Button type="default" onClick={onGoBack}>
        Go back
      </Button>
    </CardFlex>
  );
};
