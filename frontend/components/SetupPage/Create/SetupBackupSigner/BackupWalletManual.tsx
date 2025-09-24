import { Button, Flex, Form, FormItemProps, Input, Typography } from 'antd';
import { getAddress } from 'ethers/lib/utils';

import { AppleIcon } from '@/components/custom-icons/AppleIcon';
import { GoogleIcon } from '@/components/custom-icons/GoogleIcon';
import { FormFlex } from '@/components/styled/FormFlex';
import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { Address } from '@/types/Address';

import { useWeb3AuthBackupWallet } from '../hooks/useWeb3AuthBackupWallet';

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

export const BackupWalletManual = () => {
  const { goto, setBackupSigner } = useSetup();
  const [form] = Form.useForm();

  const handleFinish = (values: { 'backup-signer': string }) => {
    // important to lowercase the address before check summing, invalid checksums will
    // return null if invalid, ethers type is incorrect.
    const checksummedAddress = getAddress(
      values['backup-signer'].toLowerCase(),
    ) as Address | null;

    // If the address is invalid, show an error message
    if (!checksummedAddress) {
      return form.setFields([
        { name: 'backup-signer', errors: [invalidAddressMessage] },
      ]);
    }

    setBackupSigner({ address: checksummedAddress, type: 'manual' });
    goto(SetupScreen.AgentSelection);
  };

  const handleWeb3AuthSetupFinish = () => {
    goto(SetupScreen.AgentSelection);
  };

  const { openWeb3AuthModel } = useWeb3AuthBackupWallet({
    onFinish: handleWeb3AuthSetupFinish,
  });

  return (
    <>
      <FormFlex layout="vertical" form={form} onFinish={handleFinish}>
        <Form.Item
          name="backup-signer"
          label="Enter Backup Wallet Address"
          rules={walletFieldRules}
        >
          <Input size="large" placeholder="e.g. 0x12345...54321" />
        </Form.Item>
        <Button type="primary" size="large" htmlType="submit">
          Continue
        </Button>
      </FormFlex>

      <Button type="link" size="large" onClick={openWeb3AuthModel}>
        <Flex justify="center" align="center">
          Set Up Wallet with&nbsp;
          <GoogleIcon fill={COLOR.PRIMARY} />
          &nbsp;/&nbsp;
          <AppleIcon fill={COLOR.PRIMARY} />
        </Flex>
      </Button>

      <Text type="secondary" className="text-sm mt-16">
        Keep your backup wallet secure. If you lose both your password and
        backup wallet, you&apos;ll lose access to Pearl — permanently.
      </Text>
    </>
  );
};
