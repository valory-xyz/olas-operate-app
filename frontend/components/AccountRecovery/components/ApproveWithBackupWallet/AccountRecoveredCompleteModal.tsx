import { Button, Flex, Modal, Typography } from 'antd';

import { SuccessOutlined } from '@/components/custom-icons';
import { SETUP_SCREEN } from '@/constants';
import { useSetup } from '@/hooks';

const { Title, Text } = Typography;

export const AccountRecoveredCompleteModal = () => {
  const { goto } = useSetup();

  return (
    <Modal open footer={null} closable={false} centered>
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
          onClick={() => goto(SETUP_SCREEN.Welcome)}
          type="primary"
          block
          size="large"
        >
          Back to Login
        </Button>
      </Flex>
    </Modal>
  );
};
