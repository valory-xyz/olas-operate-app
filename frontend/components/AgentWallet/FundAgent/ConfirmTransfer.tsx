import { LoadingOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Typography } from 'antd';
import { isEmpty, values } from 'lodash';
import { useState } from 'react';

import { SuccessOutlined } from '@/components/custom-icons';
import { CardFlex } from '@/components/ui/CardFlex';
import { SUPPORT_URL, UNICODE_SYMBOLS } from '@/constants';

const { Title, Text, Link } = Typography;

const TransferInProgress = () => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <LoadingOutlined />
    </Flex>
    <Flex gap={12} vertical align="center" className="text-center">
      <Title level={4} className="m-0">
        Transfer in Progress
      </Title>
      <Text className="text-neutral-tertiary">
        It usually takes 1-2 minutes.
      </Text>
    </Flex>
  </Flex>
);

const TransferComplete = ({ onClose }: { onClose: () => void }) => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <SuccessOutlined />
    </Flex>

    <Flex gap={12} vertical className="text-center">
      <Title level={4} className="m-0">
        Transfer Complete!
      </Title>
      <Text className="text-neutral-tertiary">
        Funds transferred to the Pearl wallet.
      </Text>
    </Flex>

    <Button onClick={onClose} type="primary" block size="large">
      Close
    </Button>
  </Flex>
);

type TransferFailedProps = { onTryAgain: () => void };
const TransferFailed = ({ onTryAgain }: TransferFailedProps) => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <WarningOutlined />
    </Flex>

    <Flex gap={12} vertical className="text-center">
      <Title level={4} className="m-0">
        Transfer Failed
      </Title>
      <Text className="text-neutral-tertiary">
        Something went wrong with your transfer. Please try again or contact the
        Olas community.
      </Text>
    </Flex>

    <Flex gap={16} vertical className="text-center">
      <Button onClick={onTryAgain} type="primary" block size="large">
        Try Again
      </Button>
      <Link href={SUPPORT_URL} target="_blank" rel="noreferrer">
        Join Olas Community Discord Server {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </Link>
    </Flex>
  </Flex>
);

type ConfirmTransferProps = {
  fundsToTransfer: Record<string, number>;
};

export const ConfirmTransfer = ({ fundsToTransfer }: ConfirmTransferProps) => {
  const [isTransferStateModalVisible, setIsTransferStateModalVisible] =
    useState(false);
  const isLoading = false;
  const isError = false;
  const isSuccess = false;

  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Button
        disabled={
          isEmpty(fundsToTransfer) ||
          values(fundsToTransfer).every((x) => x === 0)
        }
        onClick={() => setIsTransferStateModalVisible(true)}
        type="primary"
        className="w-full"
        size="large"
      >
        Confirm Transfer
      </Button>

      {isTransferStateModalVisible && (
        <Modal
          onCancel={
            isLoading ? undefined : () => setIsTransferStateModalVisible(false)
          }
          closable={!isLoading}
          open
          width={436}
          title={null}
          footer={null}
        >
          {isError ? (
            <TransferFailed onTryAgain={() => {}} />
          ) : isSuccess ? (
            <TransferComplete onClose={() => {}} />
          ) : (
            <TransferInProgress />
          )}
        </Modal>
      )}
    </CardFlex>
  );
};
