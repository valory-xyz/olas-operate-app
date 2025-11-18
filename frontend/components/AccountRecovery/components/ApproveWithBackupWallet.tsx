import { Button, Flex, Modal, Typography } from 'antd';
import { useState } from 'react';

import { SuccessOutlined } from '@/components/custom-icons';
import { SetupScreen } from '@/enums';
import { useSetup } from '@/hooks';

const { Title, Text } = Typography;

const AccountRecoveredComplete = () => {
  const { goto } = useSetup();

  return (
    <Flex gap={32} vertical>
      <Flex align="center" justify="center">
        <SuccessOutlined />
      </Flex>

      <Flex gap={12} vertical className="text-center">
        <Title level={4} className="m-0">
          Pearl Account Recovered!
        </Title>
        <Text className="text-neutral-tertiary">
          You can now access your Pearl account with the new password.
        </Text>
      </Flex>

      <Button
        onClick={() => goto(SetupScreen.Welcome)}
        type="primary"
        block
        size="large"
      >
        Back to Login
      </Button>
    </Flex>
  );
};

export const ApproveWithBackupWallet = () => {
  // Set to true when "/complete" is reached
  const [isAccountRecovered, setIsAccountRecovered] = useState(false);

  return (
    <>
      <div>To be implemented</div>
      <Modal
        open={isAccountRecovered}
        footer={null}
        onCancel={() => {}}
        closable={false}
      >
        <AccountRecoveredComplete />
      </Modal>
    </>
  );
};
