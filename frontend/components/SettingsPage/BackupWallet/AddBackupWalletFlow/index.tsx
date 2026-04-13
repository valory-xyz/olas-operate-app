import {
  Button,
  Flex,
  Form,
  FormItemProps,
  Input,
} from 'antd';
import { getAddress } from 'ethers/lib/utils';
import { useState } from 'react';

import { Alert, LoadingSpinner, Modal } from '@/components/ui';
import { BackupWalletWeb3Auth } from '@/components/SetupPage/Create/SetupBackupSigner/BackupWalletWeb3Auth';
import { useApplyBackupOwner } from '@/hooks';
import { useSupportModal } from '@/context/SupportModalProvider';
import { Address } from '@/types/Address';

type AddStep = 'METHOD' | 'MANUAL' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';

type AddBackupWalletFlowProps = {
  open: boolean;
  onClose: () => void;
};

const invalidAddressMessage = 'Please input a valid backup wallet address!';
const walletFieldRules: FormItemProps['rules'] = [
  {
    required: true,
    len: 42,
    pattern: /^0x[a-fA-F0-9]{40}$/,
    type: 'string',
    message: invalidAddressMessage,
  },
];

export const AddBackupWalletFlow = ({
  open,
  onClose,
}: AddBackupWalletFlowProps) => {
  const [step, setStep] = useState<AddStep>('METHOD');
  const [form] = Form.useForm();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();
  const { toggleSupportModal } = useSupportModal();

  const handleClose = () => {
    setStep('METHOD');
    onClose();
  };

  const applyAddress = async (address: string) => {
    setStep('IN_PROGRESS');
    try {
      await applyBackupOwner({ backup_owner: address });
      setStep('SUCCESS');
    } catch {
      setStep('FAILURE');
    }
  };

  const handleWeb3AuthFinish = (address: Address) => {
    applyAddress(address);
  };

  const handleManualSubmit = (values: { 'backup-signer': string }) => {
    const checksummedAddress = getAddress(
      values['backup-signer'].toLowerCase(),
    ) as Address | null;

    if (!checksummedAddress) {
      form.setFields([
        { name: 'backup-signer', errors: [invalidAddressMessage] },
      ]);
      return;
    }

    applyAddress(checksummedAddress);
  };

  const handleRetry = () => {
    setStep('METHOD');
  };

  if (!open) return null;

  if (step === 'METHOD') {
    return (
      <Modal
        open={open}
        size="medium"
        closable
        onCancel={handleClose}
        title="Set Up Backup Wallet"
        description="To help keep your funds safe, set up a backup wallet. Alternatively, you can add your existing crypto wallet as a backup if you have one."
        action={
          <Flex vertical gap={12} className="w-full mt-16">
            <BackupWalletWeb3Auth
              onSetUpManuallyClick={() => setStep('MANUAL')}
              onFinish={handleWeb3AuthFinish}
            />
          </Flex>
        }
      />
    );
  }

  if (step === 'MANUAL') {
    return (
      <Modal
        open={open}
        size="medium"
        closable
        onCancel={handleClose}
        title="Provide Existing Backup Wallet"
        action={
          <Flex vertical gap={12} className="w-full mt-16">
            <Form layout="vertical" form={form} onFinish={handleManualSubmit}>
              <Form.Item
                name="backup-signer"
                label="Enter Backup Wallet Address"
                rules={walletFieldRules}
              >
                <Input size="large" placeholder="e.g. 0x12345...54321" />
              </Form.Item>
              <Alert
                type="warning"
                showIcon
                message="Keep your backup wallet secure. If you lose both your password and backup wallet, you'll lose access to Pearl — permanently."
                className="mb-16"
              />
              <Button type="primary" block htmlType="submit">
                Add Backup Wallet
              </Button>
            </Form>
          </Flex>
        }
      />
    );
  }

  if (step === 'IN_PROGRESS') {
    return (
      <Modal
        open={open}
        size="medium"
        closable={false}
        header={<LoadingSpinner size={40} />}
        title="Adding Backup Wallet"
        description="Adding backup wallet across all chains. Please keep the app open until the update is done."
      />
    );
  }

  if (step === 'SUCCESS') {
    return (
      <Modal
        open={open}
        size="medium"
        closable
        onCancel={handleClose}
        title="Backup Wallet Added!"
        description="Your backup wallet has been successfully added."
        action={
          <Button type="primary" onClick={handleClose} className="mt-16">
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
      onCancel={handleClose}
      title="Backup Wallet Not Added"
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
