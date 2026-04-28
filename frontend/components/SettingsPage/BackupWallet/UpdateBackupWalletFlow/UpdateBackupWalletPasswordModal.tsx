import { Button, Flex, Form, Input } from 'antd';
import { useState } from 'react';

import { Alert, Modal } from '@/components/ui';
import { SettingsScreenMap } from '@/constants/screen';
import { useSettings, useValidatePassword } from '@/hooks';

import { useUpdateBackupWallet } from './UpdateBackupWalletContext';

type UpdateBackupWalletPasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

export const UpdateBackupWalletPasswordModal = ({
  open,
  onClose,
}: UpdateBackupWalletPasswordModalProps) => {
  const { goto } = useSettings();
  const { setPassword } = useUpdateBackupWallet();
  const { isLoading: isValidating, validatePassword } = useValidatePassword();
  const [passwordError, setPasswordError] = useState(false);
  const [form] = Form.useForm();

  const handleClose = () => {
    setPasswordError(false);
    form.resetFields();
    onClose();
  };

  const handlePasswordSubmit = async (values: { password: string }) => {
    setPasswordError(false);
    const isValid = await validatePassword(values.password);
    if (isValid) {
      setPassword(values.password);
      form.resetFields();
      onClose();
      goto(SettingsScreenMap.UpdateBackupWalletMethod);
    } else {
      setPasswordError(true);
    }
  };

  if (!open) return null;

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
          <Form form={form} layout="vertical" onFinish={handlePasswordSubmit}>
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
              <Button type="primary" htmlType="submit" loading={isValidating}>
                Continue
              </Button>
            </Flex>
          </Form>
        </Flex>
      }
    />
  );
};
