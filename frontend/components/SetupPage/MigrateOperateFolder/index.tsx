import { Button, Flex, Tag, Typography } from 'antd';

import { SETUP_SCREEN } from '@/constants';
import { useSetup } from '@/hooks';

import { BackButton } from '../../ui/BackButton';

const { Title, Text } = Typography;

const MigrationSteps = () => (
  <Flex vertical gap={16}>
    <Flex vertical gap={12}>
      <Flex gap={12}>
        <Text strong style={{ minWidth: 20 }}>
          1.
        </Text>
        <Text>Quit Pearl app on this machine.</Text>
      </Flex>

      <Flex gap={12}>
        <Text strong style={{ minWidth: 20 }}>
          2.
        </Text>
        <Flex vertical gap={8}>
          <Text>
            Locate the .operate folder on your previous machine or backup.
          </Text>
          <Flex vertical gap={4} style={{ paddingLeft: 8 }}>
            <Flex align="center" gap={8}>
              <Tag color="blue">MacOS</Tag>
              <Text code>~/Users/&lt;username&gt;/.operate</Text>
            </Flex>
            <Flex align="center" gap={8}>
              <Tag color="blue">Windows</Tag>
              <Text code>C:\Users\&lt;username&gt;\.operate</Text>
            </Flex>
            <Flex align="center" gap={8}>
              <Tag>Linux</Tag>
              <Text code>/home/&lt;username&gt;/.operate</Text>
            </Flex>
          </Flex>
          <Text type="secondary" style={{ fontSize: 12 }}>
            .operate folder is hidden by default on MacOS and Linux. To unhide,
            press <Text strong>Cmd+Shift+.</Text> / (
            <Text strong>Ctrl+H</Text> on Linux)
          </Text>
        </Flex>
      </Flex>

      <Flex gap={12}>
        <Text strong style={{ minWidth: 20 }}>
          3.
        </Text>
        <Text>
          Place it on this machine to the same directory as specified above.
        </Text>
      </Flex>

      <Flex gap={12}>
        <Text strong style={{ minWidth: 20 }}>
          4.
        </Text>
        <Text>Start Pearl and sign in with your original password.</Text>
      </Flex>
    </Flex>
  </Flex>
);

const WithdrawFundsSection = () => {
  const { goto } = useSetup();

  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: 16,
        marginTop: 24,
      }}
    >
      <Flex vertical gap={8}>
        <Text strong>Lost your .operate folder?</Text>
        <Text type="secondary">
          You can still withdraw part of your funds using your secret recovery
          phrase.
        </Text>
        <Button
          type="default"
          onClick={() => goto(SETUP_SCREEN.FundRecovery)}
        >
          Withdraw Funds
        </Button>
      </Flex>
    </div>
  );
};

export const MigrateOperateFolder = () => {
  const { goto } = useSetup();

  return (
    <Flex vertical>
      <Flex align="center" style={{ marginBottom: 16 }}>
        <BackButton onPrev={() => goto(SETUP_SCREEN.AccountRecovery)} />
      </Flex>

      <Flex vertical gap={24}>
        <Flex vertical gap={8}>
          <Title level={3} className="m-0">
            Recover an Existing Pearl Account
          </Title>
          <Text type="secondary">
            Your Pearl account lives in a folder called{' '}
            <Text strong>.operate</Text>. If you have access to it from a
            previous machine or backup, follow the steps below.
          </Text>
        </Flex>

        <MigrationSteps />
        <WithdrawFundsSection />
      </Flex>
    </Flex>
  );
};
