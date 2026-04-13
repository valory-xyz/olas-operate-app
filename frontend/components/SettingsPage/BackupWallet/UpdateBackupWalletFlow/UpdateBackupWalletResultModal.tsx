import { Button, Flex } from 'antd';

import { SuccessOutlined, WarningOutlined } from '@/components/custom-icons';
import { LoadingSpinner, Modal } from '@/components/ui';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useSyncBackupOwner } from '@/hooks';

type ResultStatus = 'idle' | 'in_progress' | 'success' | 'failure';

type UpdateBackupWalletResultModalProps = {
  status: ResultStatus;
  onDone: () => void;
  onRetry: () => void;
};

export const UpdateBackupWalletResultModal = ({
  status,
  onDone,
  onRetry,
}: UpdateBackupWalletResultModalProps) => {
  const { mutateAsync: syncBackupOwner } = useSyncBackupOwner();
  const { toggleSupportModal } = useSupportModal();

  const handleRetry = async () => {
    onRetry();
    try {
      await syncBackupOwner();
    } catch {
      // failure handled by parent
    }
  };

  if (status === 'in_progress') {
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

  if (status === 'success') {
    return (
      <Modal
        open
        size="medium"
        closable
        onCancel={onDone}
        header={<SuccessOutlined />}
        title="Backup Wallet Updated!"
        description="Your backup wallet has been successfully updated."
        action={
          <Button type="primary" onClick={onDone} className="mt-16">
            Done
          </Button>
        }
      />
    );
  }

  if (status === 'failure') {
    return (
      <Modal
        open
        size="medium"
        closable
        onCancel={onDone}
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
