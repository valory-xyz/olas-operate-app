import { Button, Flex } from 'antd';
import { useEffect, useState } from 'react';

import { LoadingSpinner, Modal } from '@/components/ui';
import { useSyncBackupOwner } from '@/hooks';
import { useSupportModal } from '@/context/SupportModalProvider';

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
  const { toggleSupportModal } = useSupportModal();

  useEffect(() => {
    if (!open) return;

    setStep('IN_PROGRESS');

    syncBackupOwner()
      .then(() => setStep('SUCCESS'))
      .catch(() => setStep('FAILURE'));
  }, [open, syncBackupOwner]);

  const handleRetry = () => {
    setStep('IN_PROGRESS');
    syncBackupOwner()
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
      title="Backup Wallet Sync Failed"
      description="Please try again or contact the Valory support."
      action={
        <Flex gap={8} className="mt-16">
          <Button onClick={handleRetry}>Try Again</Button>
          <Button type="link" onClick={toggleSupportModal}>
            Contact Support
          </Button>
        </Flex>
      }
    />
  );
};
