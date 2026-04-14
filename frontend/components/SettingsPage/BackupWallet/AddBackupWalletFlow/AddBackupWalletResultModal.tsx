import { Button, Flex } from 'antd';

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
  onRetry: () => void;
};

export const AddBackupWalletResultModal = ({
  status,
  onDone,
  onRetry,
}: AddBackupWalletResultModalProps) => {
  const { toggleSupportModal } = useSupportModal();

  if (status === 'idle') return null;

  if (status === 'in_progress') {
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

  if (status === 'success') {
    return (
      <Modal
        open
        size="medium"
        closable
        onCancel={onDone}
        header={<SuccessOutlined />}
        title="Backup Wallet Added!"
        description="Your backup wallet has been successfully added."
        action={
          <Button type="primary" onClick={onDone} className="mt-16">
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
      onCancel={onDone}
      header={<WarningOutlined />}
      title="Backup Wallet Not Added"
      description="Please try again or contact the Valory support."
      action={
        <Flex vertical gap={8} align="center" className="mt-16">
          <Button type="primary" onClick={onRetry}>
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
