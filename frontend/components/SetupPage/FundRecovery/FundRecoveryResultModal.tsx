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

  const isSuccess =
    result?.success === true && result.partial_failure === false;
  const isPartialFailure = result?.partial_failure === true;
  const isError = !!error || isPartialFailure;

  const modalConfig = isExecuting
    ? {
        header: (
          <LoadingOutlined style={{ fontSize: 48, color: COLOR.PRIMARY }} />
        ),
        title: 'Withdrawal in Progress',
        description:
          'It usually takes a few minutes. Please keep the app open until the process is complete.',
        closable: true,
        action: null,
      }
    : isSuccess
      ? {
          header: (
            <CheckCircleFilled style={{ fontSize: 48, color: COLOR.SUCCESS }} />
          ),
          title: 'Withdrawal Complete!',
          description: 'Funds transferred to your external wallet.',
          closable: false,
          action: (
            <Button
              type="primary"
              size="large"
              block
              onClick={() => goto(SETUP_SCREEN.Welcome)}
            >
              Done
            </Button>
          ),
        }
      : isError
        ? {
            header: (
              <WarningFilled
                style={{ fontSize: 48, color: COLOR.ICON_COLOR.DANGER }}
              />
            ),
            title: 'Withdrawal Failed',
            description: (
              <Flex vertical align="center" gap={8}>
                <Text type="secondary" className="text-center">
                  Something went wrong with your withdrawal. Please try again or
                  contact Valory support.
                </Text>
                {isPartialFailure && (
                  <Flex vertical gap={4} align="center">
                    <Text type="secondary" className="text-center text-sm">
                      Some funds may have been transferred successfully.
                    </Text>
                    {result?.errors && result.errors.length > 0 && (
                      <Flex vertical gap={2}>
                        {result.errors.map((err, i) => (
                          <Text key={i} type="danger" className="text-sm">
                            &bull; {err}
                          </Text>
                        ))}
                      </Flex>
                    )}
                    <Text type="secondary" className="text-center text-sm">
                      If the failure was due to insufficient gas, please top up
                      the native token on the affected chain before retrying.
                    </Text>
                  </Flex>
                )}
              </Flex>
            ),
            closable: true,
            action: (
              <Flex vertical gap={8} style={{ width: '100%' }}>
                <Button type="primary" size="large" block onClick={onTryAgain}>
                  Try Again
                </Button>
                <Button size="large" block onClick={toggleSupportModal}>
                  Contact Support
                </Button>
              </Flex>
            ),
          }
        : null;

  if (!modalConfig) return null;

  return (
    <Modal
      open={open}
      size="medium"
      closable={modalConfig.closable}
      onCancel={modalConfig.closable ? (onClose ?? onTryAgain) : undefined}
      header={modalConfig.header}
      title={modalConfig.title}
      description={modalConfig.description}
      action={modalConfig.action}
    />
  );
};
