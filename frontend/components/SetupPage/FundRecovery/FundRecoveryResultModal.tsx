import {
  CheckCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Flex, Modal, Typography } from 'antd';

import { COLOR, SETUP_SCREEN } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useSetup } from '@/hooks';
import { FundRecoveryExecuteResponse } from '@/types/FundRecovery';

const { Title, Text } = Typography;

type FundRecoveryResultModalProps = {
  result: FundRecoveryExecuteResponse | null;
  error: Error | null;
  open: boolean;
  isExecuting: boolean;
  onTryAgain: () => void;
};

export const FundRecoveryResultModal = ({
  result,
  error,
  open,
  isExecuting,
  onTryAgain,
}: FundRecoveryResultModalProps) => {
  const { goto } = useSetup();
  const { toggleSupportModal } = useSupportModal();

  const isSuccess = result?.success === true && result.partial_failure === false;
  const isPartialFailure = result?.partial_failure === true;
  const isError = (!!error && !result) || isPartialFailure;

  if (isExecuting) {
    return (
      <Modal open={open} footer={null} closable={false} centered width={400}>
        <Flex vertical align="center" gap={16} style={{ padding: '24px 0' }}>
          <LoadingOutlined style={{ fontSize: 48, color: COLOR.PRIMARY }} />
          <Title level={4} className="m-0">
            Withdrawal in Progress
          </Title>
          <Text type="secondary" style={{ textAlign: 'center' }}>
            It usually takes a few minutes. Please keep Pearl open.
          </Text>
        </Flex>
      </Modal>
    );
  }

  if (isSuccess) {
    return (
      <Modal open={open} footer={null} closable={false} centered width={400}>
        <Flex vertical align="center" gap={16} style={{ padding: '24px 0' }}>
          <CheckCircleOutlined
            style={{ fontSize: 48, color: COLOR.SUCCESS }}
          />
          <Title level={4} className="m-0">
            Withdrawal Complete!
          </Title>
          <Text type="secondary" style={{ textAlign: 'center' }}>
            Your funds have been successfully sent to your destination address.
          </Text>
          <Button
            type="primary"
            size="large"
            block
            onClick={() => goto(SETUP_SCREEN.Welcome)}
          >
            Done
          </Button>
        </Flex>
      </Modal>
    );
  }

  if (isError) {
    return (
      <Modal open={open} footer={null} closable={false} centered width={400}>
        <Flex vertical align="center" gap={16} style={{ padding: '24px 0' }}>
          <WarningOutlined style={{ fontSize: 48, color: COLOR.WARNING }} />
          <Title level={4} className="m-0">
            Withdrawal Failed
          </Title>
          {isPartialFailure && (
            <Text
              type="secondary"
              style={{ textAlign: 'center', fontSize: 13 }}
            >
              Some funds may have been transferred successfully.
            </Text>
          )}
          <Flex vertical gap={8} style={{ width: '100%' }}>
            <Button type="primary" size="large" block onClick={onTryAgain}>
              Try Again
            </Button>
            <Button size="large" block onClick={toggleSupportModal}>
              Contact Support
            </Button>
          </Flex>
        </Flex>
      </Modal>
    );
  }

  return null;
};
