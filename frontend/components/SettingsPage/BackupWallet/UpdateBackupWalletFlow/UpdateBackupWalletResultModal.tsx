import { Button, Flex } from 'antd';
import { useState } from 'react';

import { SuccessOutlined, WarningOutlined } from '@/components/custom-icons';
import { LoadingSpinner, Modal } from '@/components/ui';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useSyncBackupOwner } from '@/hooks';

type ResultStatus = 'idle' | 'in_progress' | 'success' | 'failure';

type UpdateBackupWalletResultModalProps = {
  status: ResultStatus;
  onDone: () => void;
};

export const UpdateBackupWalletResultModal = ({
  status,
  onDone,
}: UpdateBackupWalletResultModalProps) => {
  const { mutateAsync: syncBackupOwner } = useSyncBackupOwner();
  const { toggleSupportModal } = useSupportModal();
  const [internalStatus, setInternalStatus] = useState<ResultStatus>('idle');

  // Use internal status if retrying, otherwise use parent status
  const activeStatus = internalStatus !== 'idle' ? internalStatus : status;

  const handleRetry = async () => {
    setInternalStatus('in_progress');
    try {
      await syncBackupOwner();
      setInternalStatus('success');
    } catch {
      setInternalStatus('failure');
    }
  };

  const handleDone = () => {
    setInternalStatus('idle');
    onDone();
  };

  if (activeStatus === 'in_progress') {
    return (
      <Modal
        open
        size="medium"
        closable={false}
        header={<LoadingSpinner size={40} />}
        title="Backup Wallet Update in Progress"
        description="Updating backup wallet across all chains. Please keep the app open until the update is done."
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
        title="Backup Wallet Updated!"
        description="Your backup wallet has been successfully updated."
        action={
          <Button type="primary" onClick={handleDone} className="mt-16">
            Done
          </Button>
        }
      />
    );
  }

  if (activeStatus === 'failure') {
    return (
      <Modal
        open
        size="medium"
        closable
        onCancel={handleDone}
        header={<WarningOutlined />}
        title="Backup Wallet Update Failed"
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
  }

  return null;
};
