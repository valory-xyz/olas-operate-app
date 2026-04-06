import { Button, Divider, Flex, Typography } from 'antd';

import { SETUP_SCREEN } from '@/constants';
import { useSetup } from '@/hooks';

import { BackButton } from '../../ui/BackButton';

const { Title, Text, Paragraph } = Typography;

const OS_PATHS = {
  macOS: '~/Library/Application Support/Pearl/.operate',
  Windows: '%APPDATA%\\Pearl\\.operate',
  Linux: '~/.config/Pearl/.operate',
} as const;

const MigrationSteps = () => (
  <Flex vertical gap={16}>
    <Title level={5} className="m-0">
      How to migrate your .operate folder
    </Title>

    <Flex vertical gap={12}>
      <Flex gap={12}>
        <Text strong style={{ minWidth: 20 }}>
          1.
        </Text>
        <Text>
          On your <strong>old device</strong>, locate the{' '}
          <Text code>.operate</Text> folder. It is a hidden folder — enable
          hidden files in your file explorer to see it.
        </Text>
      </Flex>

      <Flex gap={12}>
        <Text strong style={{ minWidth: 20 }}>
          2.
        </Text>
        <Flex vertical gap={4}>
          <Text>Default paths by operating system:</Text>
          <Flex vertical gap={2} style={{ paddingLeft: 8 }}>
            {Object.entries(OS_PATHS).map(([os, path]) => (
              <Text key={os}>
                <strong>{os}:</strong> <Text code>{path}</Text>
              </Text>
            ))}
          </Flex>
        </Flex>
      </Flex>

      <Flex gap={12}>
        <Text strong style={{ minWidth: 20 }}>
          3.
        </Text>
        <Text>
          Copy the entire <Text code>.operate</Text> folder to the same location
          on your <strong>new device</strong>.
        </Text>
      </Flex>

      <Flex gap={12}>
        <Text strong style={{ minWidth: 20 }}>
          4.
        </Text>
        <Text>
          Open Pearl on your new device and sign in with your existing password.
        </Text>
      </Flex>
    </Flex>

    <Paragraph type="secondary" style={{ fontSize: 12 }}>
      Tip: On macOS press <Text code>Cmd + Shift + .</Text> in Finder to toggle
      hidden files. On Windows, enable &quot;Hidden items&quot; in the View
      menu.
    </Paragraph>
  </Flex>
);

const WithdrawFundsSection = () => {
  const { goto } = useSetup();

  return (
    <Flex vertical gap={12} style={{ padding: '20px 0' }}>
      <Divider style={{ margin: 0 }} />
      <Flex vertical gap={8} style={{ paddingTop: 8 }}>
        <Text strong>Lost your .operate folder?</Text>
        <Text type="secondary">
          If you no longer have access to your .operate folder, you can withdraw
          your on-chain funds using your 12-word recovery phrase.
        </Text>
        <Button
          type="primary"
          size="large"
          onClick={() => goto(SETUP_SCREEN.FundRecovery)}
        >
          Withdraw Funds
        </Button>
      </Flex>
    </Flex>
  );
};

export const MigrateOperateFolder = () => {
  const { goto } = useSetup();

  return (
    <Flex vertical style={{ padding: '24px 24px 32px' }}>
      <Flex align="center" style={{ marginBottom: 16 }}>
        <BackButton onPrev={() => goto(SETUP_SCREEN.AccountRecovery)} />
      </Flex>

      <Flex vertical gap={24}>
        <Flex vertical gap={8}>
          <Title level={3} className="m-0">
            Recover an Existing Pearl Account
          </Title>
          <Text type="secondary">
            Move your .operate folder to a new device to restore your Pearl
            account and agents.
          </Text>
        </Flex>

        <MigrationSteps />
        <WithdrawFundsSection />
      </Flex>
    </Flex>
  );
};
