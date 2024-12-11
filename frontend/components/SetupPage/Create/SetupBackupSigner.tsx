import { Button, Flex, Form, Input, Typography } from 'antd';
import { getAddress } from 'ethers/lib/utils';

import { CardFlex } from '@/components/styled/CardFlex';
import { FormFlex } from '@/components/styled/FormFlex';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { Address } from '@/types/Address';

import { SetupCreateHeader } from './SetupCreateHeader';

const invalidAddressMessage = 'Please input a valid backup wallet address!';

export const SetupBackupSigner = () => {
  const { goto } = useSetup();
  const { setBackupSigner } = useSetup();
  const [form] = Form.useForm();

  const handleFinish = (values: { 'backup-signer': string }) => {
    // important to lowercase the address before check summing, invalid checksums will cause ethers to throw
    // returns null if invalid, ethers type is incorrect...
    const checksummedAddress = getAddress(
      values['backup-signer'].toLowerCase(),
    ) as Address | null;

    // If the address is invalid, show an error message
    if (!checksummedAddress) {
      return form.setFields([
        { name: 'backup-signer', errors: [invalidAddressMessage] },
      ]);
    }

    setBackupSigner(checksummedAddress);
    goto(SetupScreen.AgentSelection);
  };

  return (
    <CardFlex>
      <SetupCreateHeader prev={SetupScreen.SetupSeedPhrase} />
      <Typography.Title level={3}>Set backup wallet</Typography.Title>
      <Flex vertical gap={10}>
        <Typography.Text>
          To help keep your funds safe, we encourage you to add one of your
          existing crypto wallets as a backup. You may recover your funds to
          your backup wallet if you lose both your password and seed phrase.
        </Typography.Text>

        <FormFlex layout="vertical" form={form} onFinish={handleFinish}>
          <Form.Item
            name="backup-signer"
            label="Backup wallet address"
            rules={[
              {
                required: true,
                len: 42,
                pattern: /^0x[a-fA-F0-9]{40}$/,
                type: 'string',
                message: invalidAddressMessage,
              },
            ]}
          >
            <Input size="large" placeholder={'e.g. 0x12345...54321'} />
          </Form.Item>
          <Button type="primary" size="large" htmlType="submit">
            Add backup wallet and continue
          </Button>
          {/* 
            Commented to protect users from skipping backup wallet setup during Alpha testing          
            <Button
              type="link"
              size="large"
              onClick={() => goto(SetupScreen.SetupEoaFunding)}
            >
              Skip for now
            </Button> 
          */}
        </FormFlex>

        <Typography.Text type="secondary" className="text-sm">
          Note that in the current version of the app, you will not be able to
          set up a backup wallet afterward. This functionality is coming soon.
        </Typography.Text>
      </Flex>
    </CardFlex>
  );
};
