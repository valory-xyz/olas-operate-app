import { CloseOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { memo } from 'react';

import { CardFlex } from '@/components/ui/CardFlex';
import { CardSection } from '@/components/ui/CardSection';
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

export const SetupRestoreMain = () => {
  const { goto } = useSetup();

  return (
    <CardFlex
      $noBorder
      title={
        <Flex justify="space-between" align="center">
          <Title className="m-0" level={4}>
            Restore access
          </Title>
          <ExitButton />
        </Flex>
      }
    >
      <CardSection gap={8} vertical $padding="8px 24px" align="center">
        <Text>
          If you added a backup wallet to your account, you may still restore
          your funds, but you won’t be able to recover access to your Pearl
          account.
        </Text>
        <Button
          size="large"
          className="mt-16"
          onClick={() => goto(SetupScreen.RestoreViaBackup)}
        >
          Restore funds via backup wallet
        </Button>
      </CardSection>
    </CardFlex>
  );
};

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
