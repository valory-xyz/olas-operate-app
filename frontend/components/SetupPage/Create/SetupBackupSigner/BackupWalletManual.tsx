import { Button, Flex, Form, FormItemProps, Input, Typography } from 'antd';
import { getAddress } from 'ethers/lib/utils';
import { useState } from 'react';
import { RiAppleFill, RiGoogleFill } from 'react-icons/ri';

import { FormFlex } from '@/components/ui';
import { COLOR } from '@/constants';
import { useSetup } from '@/hooks/useSetup';
import { Address } from '@/types/Address';

import { useWeb3AuthBackupWallet } from './useWeb3AuthBackupWallet';

const { Text } = Typography;

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

type BackupWalletManualProps = {
  onFinish: (address: Address) => void | Promise<void>;
};

export const BackupWalletManual = ({ onFinish }: BackupWalletManualProps) => {
  const { setBackupSigner } = useSetup();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async (values: { 'backup-signer': string }) => {
    let checksummedAddress: Address;
    try {
      checksummedAddress = getAddress(
        values['backup-signer'].toLowerCase(),
      ) as Address;
    } catch {
      form.setFields([
        { name: 'backup-signer', errors: [invalidAddressMessage] },
      ]);
      return;
    }

    setBackupSigner({ address: checksummedAddress, type: 'manual' });
    setIsSubmitting(true);
    try {
      await onFinish(checksummedAddress);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { openWeb3AuthModel } = useWeb3AuthBackupWallet({ onFinish });

  return (
    <>
      <FormFlex layout="vertical" form={form} onFinish={handleFinish}>
        <Form.Item
          name="backup-signer"
          label="Enter Backup Wallet Address"
          rules={walletFieldRules}
        >
          <Input
            size="large"
            placeholder="e.g. 0x12345...54321"
            disabled={isSubmitting}
          />
        </Form.Item>
        <Button
          type="primary"
          size="large"
          htmlType="submit"
          loading={isSubmitting}
        >
          Continue
        </Button>
      </FormFlex>

      <Button
        type="link"
        size="large"
        onClick={openWeb3AuthModel}
        disabled={isSubmitting}
      >
        <Flex justify="center" align="center">
          Set Up Wallet with&nbsp;
          <RiGoogleFill fill={COLOR.PRIMARY} />
          &nbsp;/&nbsp;
          <RiAppleFill fill={COLOR.PRIMARY} />
        </Flex>
      </Button>

      <Text type="secondary" className="text-sm mt-16">
        Keep your backup wallet secure. If you lose both your password and
        backup wallet, you&apos;ll lose access to Pearl — permanently.
      </Text>
    </>
  );
};
