import { Button, Flex } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { SuccessOutlined, WarningOutlined } from '@/components/custom-icons';
import { LoadingSpinner, Modal } from '@/components/ui';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useSyncBackupOwner } from '@/hooks';

type SyncStep = 'in_progress' | 'success' | 'failure';

type SyncBackupWalletModalProps = {
  open: boolean;
  onClose: () => void;
};

export const SyncBackupWalletModal = ({
  open,
  onClose,
}: SyncBackupWalletModalProps) => {
  const [step, setStep] = useState<SyncStep>('in_progress');
  const { mutateAsync: syncBackupOwner } = useSyncBackupOwner();
  const syncBackupOwnerRef = useRef(syncBackupOwner);
  syncBackupOwnerRef.current = syncBackupOwner;
  const { toggleSupportModal } = useSupportModal();

  useEffect(() => {
    if (!open) return;

    setStep('in_progress');

    syncBackupOwnerRef
      .current()
      .then(() => setStep('success'))
      .catch(() => setStep('failure'));
  }, [open]);

  const handleRetry = () => {
    setStep('in_progress');
    syncBackupOwnerRef
      .current()
      .then(() => setStep('success'))
      .catch(() => setStep('failure'));
  };

  if (!open) return null;

  if (step === 'in_progress') {
    return (
      <Modal
        open={open}
        size="medium"
        closable={false}
        header={<LoadingSpinner size={40} />}
        title="Backup Wallet Sync in Progress"
        description="Syncing backup wallet across all chains. Please keep the app open until the update is done."
      />
    );
  }

  if (step === 'success') {
    return (
      <Modal
        open={open}
        size="medium"
        closable
        onCancel={onClose}
        header={<SuccessOutlined />}
        title="Backup Wallet Synced!"
        description="Your backup wallet has been successfully synced."
        action={
          <Button type="primary" block onClick={onClose} className="mt-32">
            Done
          </Button>
        }
      />
    );
  }

  return (
    <Modal
      open={open}
      size="medium"
      closable
      onCancel={onClose}
      header={<WarningOutlined />}
      title="Backup Wallet Sync Failed"
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
