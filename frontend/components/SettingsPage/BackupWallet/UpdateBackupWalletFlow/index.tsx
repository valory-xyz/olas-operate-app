import {
  Button,
  Flex,
  Form,
  FormItemProps,
  Input,
  Typography,
} from 'antd';
import { getAddress } from 'ethers/lib/utils';
import { useState } from 'react';

import { AddressLink, Alert, LoadingSpinner, Modal } from '@/components/ui';
import { BackupWalletWeb3Auth } from '@/components/SetupPage/Create/SetupBackupSigner/BackupWalletWeb3Auth';
import {
  useApplyBackupOwner,
  useBackupOwnerStatus,
  useSyncBackupOwner,
  useValidatePassword,
} from '@/hooks';
import { useSupportModal } from '@/context/SupportModalProvider';
import { Address } from '@/types/Address';

const { Text } = Typography;

type UpdateStep =
  | 'PASSWORD'
  | 'METHOD'
  | 'MANUAL'
  | 'CONFIRM'
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILURE';

type UpdateBackupWalletFlowProps = {
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

export const UpdateBackupWalletFlow = ({
  open,
  onClose,
}: UpdateBackupWalletFlowProps) => {
  const [step, setStep] = useState<UpdateStep>('PASSWORD');
  const [newAddress, setNewAddress] = useState<Address | null>(null);
  const [passwordError, setPasswordError] = useState(false);
  const [sameAddressError, setSameAddressError] = useState(false);
  const [passwordForm] = Form.useForm();
  const [manualForm] = Form.useForm();

  const { backupOwnerStatus } = useBackupOwnerStatus();
  const { isLoading: isValidating, validatePassword } = useValidatePassword();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();
  const { mutateAsync: syncBackupOwner } = useSyncBackupOwner();
  const { toggleSupportModal } = useSupportModal();

  const currentAddress = backupOwnerStatus?.canonical_backup_owner ?? null;

  const handleClose = () => {
    setStep('PASSWORD');
    setNewAddress(null);
    setPasswordError(false);
    setSameAddressError(false);
    onClose();
  };

  const handlePasswordSubmit = async (values: { password: string }) => {
    setPasswordError(false);
    const isValid = await validatePassword(values.password);
    if (isValid) {
      setStep('METHOD');
    } else {
      setPasswordError(true);
    }
  };

  const handleWeb3AuthFinish = (address: Address) => {
    if (
      currentAddress &&
      address.toLowerCase() === currentAddress.toLowerCase()
    ) {
      setSameAddressError(true);
      setStep('METHOD');
      return;
    }
    setSameAddressError(false);
    setNewAddress(address);
    setStep('CONFIRM');
  };

  const handleManualSubmit = (values: { 'backup-signer': string }) => {
    const checksummedAddress = getAddress(
      values['backup-signer'].toLowerCase(),
    ) as Address | null;

    if (!checksummedAddress) {
      manualForm.setFields([
        { name: 'backup-signer', errors: [invalidAddressMessage] },
      ]);
      return;
    }

    if (
      currentAddress &&
      checksummedAddress.toLowerCase() === currentAddress.toLowerCase()
    ) {
      manualForm.setFields([
        {
          name: 'backup-signer',
          errors: [
            'This wallet address matches your current backup wallet. Please enter a different address.',
          ],
        },
      ]);
      return;
    }

    setNewAddress(checksummedAddress);
    setStep('CONFIRM');
  };

  const handleConfirm = async () => {
    if (!newAddress) return;

    setStep('IN_PROGRESS');
    try {
      await applyBackupOwner({ backup_owner: newAddress });
      setStep('SUCCESS');
    } catch {
      setStep('FAILURE');
    }
  };

  const handleRetryAsSync = async () => {
    setStep('IN_PROGRESS');
    try {
      await syncBackupOwner();
      setStep('SUCCESS');
    } catch {
      setStep('FAILURE');
    }
  };

  if (!open) return null;

  if (step === 'PASSWORD') {
    return (
      <Modal
        open={open}
        size="small"
        closable
        onCancel={handleClose}
        title="Authorize Wallet Update"
        action={
          <Flex vertical gap={12} className="w-full mt-16">
            {passwordError && (
              <Alert
                type="error"
                showIcon
                message="Password is not valid. Please try again."
              />
            )}
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordSubmit}
            >
              <Form.Item
                label="Enter password"
                name="password"
                rules={[
                  { required: true, message: 'Please enter your password' },
                ]}
              >
                <Input.Password size="large" disabled={isValidating} />
              </Form.Item>
              <Flex gap={8} justify="flex-end">
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isValidating}
                >
                  Continue
                </Button>
              </Flex>
            </Form>
          </Flex>
        }
      />
    );
  }

  if (step === 'METHOD') {
    return (
      <Modal
        open={open}
        size="medium"
        closable
        onCancel={handleClose}
        title="Update Backup Wallet"
        description="Choose how you'd like to set up your new backup wallet. This will replace your current one."
        action={
          <Flex vertical gap={12} className="w-full mt-16">
            {sameAddressError && (
              <Alert
                type="error"
                showIcon
                message="Wallet Already Linked"
                description="This wallet address matches your current backup wallet. Please enter a different address."
              />
            )}
            <BackupWalletWeb3Auth
              onSetUpManuallyClick={() => {
                setSameAddressError(false);
                setStep('MANUAL');
              }}
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
            <Form
              layout="vertical"
              form={manualForm}
              onFinish={handleManualSubmit}
            >
              <Form.Item
                name="backup-signer"
                label="Enter Backup Wallet Address"
                rules={walletFieldRules}
              >
                <Input size="large" placeholder="e.g. 0x12345...54321" />
              </Form.Item>
              <Button type="primary" block htmlType="submit">
                Continue
              </Button>
            </Form>
          </Flex>
        }
      />
    );
  }

  if (step === 'CONFIRM') {
    return (
      <Modal
        open={open}
        size="small"
        closable
        onCancel={handleClose}
        title="Confirm Backup Wallet Update"
        action={
          <Flex vertical gap={12} className="w-full mt-16">
            <Flex vertical gap={8}>
              <Flex gap={8} align="center">
                <Text type="secondary">Current backup wallet:</Text>
                {currentAddress ? (
                  <AddressLink address={currentAddress as Address} />
                ) : (
                  <Text>—</Text>
                )}
              </Flex>
              <Flex gap={8} align="center">
                <Text type="secondary">New backup wallet:</Text>
                {newAddress && <AddressLink address={newAddress} />}
              </Flex>
            </Flex>
            <Alert
              type="warning"
              showIcon
              message="This action will replace your current backup wallet. Make sure you have access to the new address."
            />
            <Flex gap={8} justify="flex-end">
              <Button onClick={() => setStep('METHOD')}>Cancel</Button>
              <Button type="primary" onClick={handleConfirm}>
                Update Backup Wallet
              </Button>
            </Flex>
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
        title="Backup Wallet Update in Progress"
        description="Updating backup wallet across all chains. Please keep the app open until the update is done."
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
        title="Backup Wallet Updated!"
        description="Your backup wallet has been successfully updated."
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
      title="Backup Wallet Update Failed"
      action={
        <Flex gap={8} className="mt-16">
          <Button onClick={handleRetryAsSync}>Try Again</Button>
          <Button type="link" onClick={toggleSupportModal}>
            Contact Support
          </Button>
        </Flex>
      }
    />
  );
};
