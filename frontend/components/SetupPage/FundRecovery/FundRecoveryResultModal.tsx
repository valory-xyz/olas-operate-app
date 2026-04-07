import {
  CheckCircleFilled,
  LoadingOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';

import { Modal } from '@/components/ui';
import { COLOR, SETUP_SCREEN } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useSetup } from '@/hooks';
import { FundRecoveryExecuteResponse } from '@/types/FundRecovery';

const { Text } = Typography;

type FundRecoveryResultModalProps = {
  result: FundRecoveryExecuteResponse | null;
  error: Error | null;
  open: boolean;
  isExecuting: boolean;
  onTryAgain: () => void;
  onClose?: () => void;
};

export const FundRecoveryResultModal = ({
  result,
  error,
  open,
  isExecuting,
  onTryAgain,
  onClose,
}: FundRecoveryResultModalProps) => {
  const { goto } = useSetup();
  const { toggleSupportModal } = useSupportModal();

  const isSuccess = result?.success === true && result.partial_failure === false;
  const isPartialFailure = result?.partial_failure === true;
  const isResultError =
    result !== null && result !== undefined && !isSuccess && !isPartialFailure;
  const isError = !!error || isPartialFailure || isResultError;

  if (isExecuting) {
    return (
      <Modal
        open={open}
        closable={false}
        size="medium"
        header={
          <LoadingOutlined style={{ fontSize: 48, color: COLOR.PRIMARY }} />
        }
        title="Withdrawal in Progress"
        description="It usually takes a few minutes. Please keep the app open until the process is complete."
      />
    );
  }

  if (isSuccess) {
    return (
      <Modal
        open={open}
        closable={false}
        size="medium"
        header={
          <CheckCircleFilled
            style={{ fontSize: 48, color: COLOR.SUCCESS }}
          />
        }
        title="Withdrawal Complete!"
        description="Funds transferred to your external wallet."
        action={
          <Button
            type="primary"
            size="large"
            block
            onClick={() => goto(SETUP_SCREEN.Welcome)}
          >
            Done
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <Modal
        open={open}
        closable
        onCancel={onClose ?? onTryAgain}
        size="medium"
        header={
          <WarningFilled style={{ fontSize: 48, color: COLOR.ICON_COLOR.DANGER }} />
        }
        title="Withdrawal Failed"
        description={
          <Flex vertical align="center" gap={8}>
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
          </Flex>
        }
        action={
          <Flex vertical gap={8} style={{ width: '100%' }}>
            <Button type="primary" size="large" block onClick={onTryAgain}>
              Try Again
            </Button>
            <Button size="large" block onClick={toggleSupportModal}>
              Contact Support
            </Button>
          </Flex>
        }
      />
    );
  }

  return null;
};
