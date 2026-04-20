import { Button, Flex } from 'antd';
import { useState } from 'react';

import { SuccessOutlined, WarningOutlined } from '@/components/custom-icons';
import { LoadingSpinner, Modal } from '@/components/ui';
import { useSupportModal } from '@/context/SupportModalProvider';

export type AddBackupWalletStatus =
  | 'idle'
  | 'in_progress'
  | 'success'
  | 'failure';

type AddBackupWalletResultModalProps = {
  status: AddBackupWalletStatus;
  onDone: () => void;
  onRetry: () => Promise<void>;
};

export const AddBackupWalletResultModal = ({
  status,
  onDone,
  onRetry,
}: AddBackupWalletResultModalProps) => {
  const { toggleSupportModal } = useSupportModal();
  const [internalStatus, setInternalStatus] =
    useState<AddBackupWalletStatus>('idle');

  const activeStatus = internalStatus !== 'idle' ? internalStatus : status;

  const handleRetry = async () => {
    setInternalStatus('in_progress');
    try {
      await onRetry();
      setInternalStatus('success');
    } catch {
      setInternalStatus('failure');
    }
  };

  const handleDone = () => {
    setInternalStatus('idle');
    onDone();
  };

  if (activeStatus === 'idle') return null;

  if (activeStatus === 'in_progress') {
    return (
      <Modal
        open
        size="medium"
        closable={false}
        header={<LoadingSpinner size={40} />}
        title="Adding Backup Wallet"
        description="Adding backup wallet across all chains. Please keep the app open until the update is done."
      />
    );
  }

  if (activeStatus === 'success') {
    return (
      <Modal
        open
        size="medium"
        closable
        onCancel={handleDone}
        header={<SuccessOutlined />}
        title="Backup Wallet Added!"
        description="Your backup wallet has been successfully added."
        action={
          <Button
            type="primary"
            block
            size="large"
            onClick={handleDone}
            className="mt-32"
          >
            Done
          </Button>
        }
      />
    );
  }

  return (
    <Modal
      open
      size="medium"
      closable
      onCancel={handleDone}
      header={<WarningOutlined />}
      title="Backup Wallet Not Added"
      description="Please try again or contact the Valory support."
      action={
        <Flex vertical gap={8} align="center" className="mt-16">
          <Button type="primary" onClick={handleRetry}>
            Try Again
          </Button>
          <Button type="link" onClick={toggleSupportModal}>
            Contact Support
          </Button>
        </Flex>
      }
    />
  );
};
