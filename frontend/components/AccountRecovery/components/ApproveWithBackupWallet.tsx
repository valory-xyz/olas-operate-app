import { useQueryClient } from '@tanstack/react-query';
import { Button, Flex, Modal, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { LoadingOutlined, SuccessOutlined } from '@/components/custom-icons';
import { Alert } from '@/components/ui';
import { CardFlex } from '@/components/ui/CardFlex';
import { REACT_QUERY_KEYS } from '@/constants';
import { SetupScreen } from '@/enums';
import { useSetup } from '@/hooks';

const { Title, Text } = Typography;

const AccountRecoveredComplete = () => {
  const { goto } = useSetup();

  return (
    <Flex gap={32} vertical align="center" style={{ padding: '24px 20px' }}>
      <Flex align="center" justify="center">
        <SuccessOutlined />
      </Flex>

      <Flex
        gap={12}
        vertical
        align="center"
        justify="center"
        className="text-center"
        style={{ maxWidth: 320 }}
      >
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
  const queryClient = useQueryClient();
  const [isAccountRecovered, setIsAccountRecovered] = useState(false); // Set to true when "/complete" is reached
  const isLoading = true; // Replace with actual loading state

  // Invalidate recovery status query to refetch updated status
  useEffect(() => {
    if (!isAccountRecovered) return;

    queryClient.invalidateQueries({
      queryKey: [REACT_QUERY_KEYS.RECOVERY_STATUS_KEY],
    });
  }, [isAccountRecovered, queryClient]);

  return (
    <Flex align="center" justify="center" className="w-full mt-40">
      <CardFlex
        $gap={16}
        styles={{ body: { padding: '16px 32px 72px 32px' } }}
        style={{ width: 784 }}
      >
        <Flex vertical gap={12}>
          <Title level={3} className="m-0">
            Approve with Your Backup Wallet
          </Title>
          <Text className="text-neutral-secondary">
            A sign-in window from your wallet provider will open here. Review
            and approve each pending transaction, and keep this window open.
          </Text>
        </Flex>

        <Alert
          type="warning"
          showIcon
          message="Don’t close this window until all transactions are approved. If you leave before finishing, you’ll need to complete the approvals later in your backup wallet outside Pearl."
        />

        {isLoading && (
          <Flex
            vertical
            align="center"
            justify="center"
            gap={16}
            style={{ marginTop: 56 }}
          >
            <LoadingOutlined />
            <Text className="text-neutral-tertiary">
              0 transactions out of 3
            </Text>
          </Flex>
        )}
      </CardFlex>

      <Modal open={isAccountRecovered} footer={null} closable={false} centered>
        <AccountRecoveredComplete />
      </Modal>
    </Flex>
  );
};
