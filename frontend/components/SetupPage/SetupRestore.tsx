import { CloseOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Typography } from 'antd';
import { memo, useState } from 'react';

import { CardFlex } from '@/components/ui/CardFlex';
import { CardSection } from '@/components/ui/CardSection';
import { COMMUNITY_ASSISTANCE_URL, SetupScreen } from '@/constants';
import { useSetup } from '@/hooks/useSetup';

const ExitButton = memo(function ExitButton() {
  const { goto } = useSetup();
  return (
    <Button size="large" onClick={() => goto(SetupScreen.Welcome)}>
      <CloseOutlined />
    </Button>
  );
});

// TODO: restyle when Pearl v1 is released
export const SetupRestoreMain = () => {
  const { goto } = useSetup();

  return (
    <CardFlex
      $noBorder
      title={
        <Flex justify="space-between" align="center">
          <Typography.Title className="m-0" level={4}>
            Restore access
          </Typography.Title>
          <ExitButton />
        </Flex>
      }
    >
      <CardSection gap={8} vertical $padding="8px 24px" align="center">
        <Typography.Text>
          If you added a backup wallet to your account, you may still restore
          your funds, but you won’t be able to recover access to your Pearl
          account.
        </Typography.Text>
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

export const SetupRestoreSetPassword = () => {
  const { goto } = useSetup();
  const [password, setPassword] = useState('');

  return (
    <CardFlex
      title={
        <Flex justify="space-between" align="center">
          <Typography.Title className="m-0" level={4}>
            Set password
          </Typography.Title>
          <ExitButton />
        </Flex>
      }
    >
      <Flex gap={24} vertical>
        <Typography.Text>
          Come up with a strong password to get access to the Pearl account in
          the future.
        </Typography.Text>
        <Flex vertical gap={16}>
          <Input.Password
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            size="large"
            value={password}
          />
          <Button
            size="large"
            type="primary"
            onClick={() => goto(SetupScreen.Welcome)}
          >
            Set password
          </Button>
        </Flex>
      </Flex>
    </CardFlex>
  );
};

export const SetupRestoreViaBackup = () => {
  return (
    <CardFlex
      title={
        <Flex justify="space-between" align="center">
          <Typography.Title className="m-0" level={4}>
            Restore funds with backup wallet
          </Typography.Title>
          <ExitButton />
        </Flex>
      }
      $noBorder
    >
      <Flex vertical gap={10}>
        <Typography.Text>
          To restore access to the fund in your Pearl account, use your backup
          wallet to connect with your Safe account and restore your funds.
        </Typography.Text>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://app.safe.global/welcome/accounts"
        >
          Open Safe interface ↗
        </a>
        <Typography.Text>Not sure how?</Typography.Text>
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
