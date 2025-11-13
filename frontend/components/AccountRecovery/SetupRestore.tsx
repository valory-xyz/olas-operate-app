import { CloseOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { memo } from 'react';

import { CardFlex } from '@/components/ui/CardFlex';
import { COMMUNITY_ASSISTANCE_URL } from '@/constants/urls';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

const { Title, Text } = Typography;

const ExitButton = memo(function ExitButton() {
  const { goto } = useSetup();
  return (
    <Button size="large" onClick={() => goto(SetupScreen.Welcome)}>
      <CloseOutlined />
    </Button>
  );
});

export const SetupRestoreViaBackup = () => {
  return (
    <CardFlex
      title={
        <Flex justify="space-between" align="center">
          <Title className="m-0" level={4}>
            Restore funds with backup wallet
          </Title>
          <ExitButton />
        </Flex>
      }
      $noBorder
    >
      <Flex vertical gap={10}>
        <Text>
          To restore access to the fund in your Pearl account, use your backup
          wallet to connect with your Safe account and restore your funds.
        </Text>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://app.safe.global/welcome/accounts"
        >
          Open Safe interface ↗
        </a>
        <Text>Not sure how?</Text>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={COMMUNITY_ASSISTANCE_URL}
        >
          Get community assistance via a Discord ticket ↗
        </a>
      </Flex>
    </CardFlex>
  );
};
