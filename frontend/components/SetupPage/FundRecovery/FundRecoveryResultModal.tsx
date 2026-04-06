import {
  CheckCircleFilled,
  LoadingOutlined,
  WarningFilled,
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
            It usually takes a few minutes. Please keep the app open until the
            process is complete.
          </Text>
        </Flex>
      </Modal>
    );
  }

  if (isSuccess) {
    return (
      <Modal open={open} footer={null} closable={false} centered width={400}>
        <Flex vertical align="center" gap={16} style={{ padding: '24px 0' }}>
          <CheckCircleFilled
            style={{ fontSize: 48, color: COLOR.SUCCESS }}
          />
          <Title level={4} className="m-0">
            Withdrawal Complete!
          </Title>
          <Text type="secondary" style={{ textAlign: 'center' }}>
            Funds transferred to your external wallet.
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
      <Modal
        open={open}
        footer={null}
        centered
        width={400}
        onCancel={onTryAgain}
      >
        <Flex vertical align="center" gap={16} style={{ padding: '24px 0' }}>
          <WarningFilled style={{ fontSize: 48, color: '#ff4d4f' }} />
          <Title level={4} className="m-0">
            Withdrawal Failed
          </Title>
          <Text type="secondary" style={{ textAlign: 'center' }}>
            Something went wrong with your withdrawal. Please try again or
            contact Valory support.
          </Text>
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
