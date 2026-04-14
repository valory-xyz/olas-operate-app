import { Button, Flex } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { SuccessOutlined, WarningOutlined } from '@/components/custom-icons';
import { LoadingSpinner, Modal } from '@/components/ui';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useSyncBackupOwner } from '@/hooks';

type SyncStep = 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';

type SyncBackupWalletModalProps = {
  open: boolean;
  onClose: () => void;
};

export const SyncBackupWalletModal = ({
  open,
  onClose,
}: SyncBackupWalletModalProps) => {
  const [step, setStep] = useState<SyncStep>('IN_PROGRESS');
  const { mutateAsync: syncBackupOwner } = useSyncBackupOwner();
  const syncBackupOwnerRef = useRef(syncBackupOwner);
  syncBackupOwnerRef.current = syncBackupOwner;
  const { toggleSupportModal } = useSupportModal();

  useEffect(() => {
    if (!open) return;

    setStep('IN_PROGRESS');

    syncBackupOwnerRef.current()
      .then(() => setStep('SUCCESS'))
      .catch(() => setStep('FAILURE'));
  }, [open]);

  const handleRetry = () => {
    setStep('IN_PROGRESS');
    syncBackupOwnerRef.current()
      .then(() => setStep('SUCCESS'))
      .catch(() => setStep('FAILURE'));
  };

  if (!open) return null;

  if (step === 'IN_PROGRESS') {
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

  if (step === 'SUCCESS') {
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
          <Button type="primary" onClick={onClose} className="mt-16">
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
