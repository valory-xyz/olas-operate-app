import { Button, Flex, Typography } from 'antd';
import { ReactNode } from 'react';
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa';
import styled from 'styled-components';

import { COLOR, SETUP_SCREEN } from '@/constants';
import { useSetup } from '@/hooks';

import { BackButton } from '../../ui/BackButton';
import { SetupCard } from '../../ui/SetupCard';

const { Title, Text } = Typography;

const OsPathRowContainer = styled(Flex)`
  background-color: ${COLOR.BORDER_LIGHT};
  border-radius: 6px;
  padding: 4px 12px;
`;

type OsPathRowProps = {
  icon: ReactNode;
  label: string;
  path: string;
};

const OsPathRow = ({ icon, label, path }: OsPathRowProps) => (
  <OsPathRowContainer align="center" gap={8}>
    <Flex align="center" gap={4} style={{ minWidth: 90 }}>
      {icon}
      <Text type="secondary" style={{ fontSize: 13 }}>
        {label}:
      </Text>
    </Flex>
    <Text strong style={{ fontSize: 13 }}>
      {path}
    </Text>
  </OsPathRowContainer>
);

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
            <OsPathRow
              icon={<FaApple />}
              label="MacOS"
              path="~/Users/<username>/.operate"
            />
            <OsPathRow
              icon={<FaWindows />}
              label="Windows"
              path="C:\Users\<username>\.operate"
            />
            <OsPathRow
              icon={<FaLinux />}
              label="Linux"
              path="/home/<username>/.operate"
            />
          </Flex>
          <Text type="secondary" style={{ fontSize: 12 }}>
            .operate folder is hidden by default on MacOS and Linux. To unhide,
            press <Text strong>Cmd+Shift+.</Text> / (<Text strong>Ctrl+H</Text>{' '}
            on Linux)
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
    <Flex vertical gap={8}>
      <Text strong>Lost your .operate folder?</Text>
      <Text type="secondary">
        You can still withdraw part of your funds using your secret recovery
        phrase.
      </Text>
      <Button
        type="default"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => goto(SETUP_SCREEN.FundRecovery)}
      >
        Withdraw Funds
      </Button>
    </Flex>
  );
};

export const MigrateOperateFolder = () => {
  const { goto } = useSetup();

  return (
    <Flex vertical gap={24} style={{ width: '100%' }}>
      <SetupCard>
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
                Your Pearl account lives in a folder called{' '}
                <Text strong>.operate</Text>. If you have access to it from a
                previous machine or backup, follow the steps below.
              </Text>
            </Flex>

            <MigrationSteps />
          </Flex>
        </Flex>
      </SetupCard>

      <SetupCard>
        <Flex vertical style={{ padding: '24px 24px 32px' }}>
          <WithdrawFundsSection />
        </Flex>
      </SetupCard>
    </Flex>
  );
};
