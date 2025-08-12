import { Button, Flex, Form, Input, Typography } from 'antd';
import { getAddress } from 'ethers/lib/utils';
import { useCallback } from 'react';

import { CardFlex } from '@/components/styled/CardFlex';
import { FormFlex } from '@/components/styled/FormFlex';
import { BackButton } from '@/components/ui/BackButton';
import { FormLabel } from '@/components/ui/Typography';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { Address } from '@/types/Address';

const { Title, Text } = Typography;

const invalidAddressMessage = 'Please input a valid backup wallet address!';

const SetupBackupTitle = () => (
  <Flex vertical gap={12} style={{ margin: '16px 0 32px 0' }}>
    <Title level={3} className="m-0">
      Set Up Backup Wallet
    </Title>
    <Text type="secondary">
      To help keep your funds safe, set up a backup wallet. Alternatively, you
      can add your existing crypto wallet as a backup if you have one.
    </Text>
  </Flex>
);

export const SetupBackupSigner = () => {
  const { goto } = useSetup();
  const { setBackupSigner } = useSetup();
  const [form] = Form.useForm();

  const handleFinish = useCallback(
    (values: { backupSigner: string }) => {
      // important to lowercase the address before check summing, invalid checksums will cause ethers to throw
      // returns null if invalid, ethers type is incorrect...
      const checksummedAddress = getAddress(
        values['backupSigner'].toLowerCase(),
      ) as Address | null;

      // If the address is invalid, show an error message
      if (!checksummedAddress) {
        return form.setFields([
          { name: 'backupSigner', errors: [invalidAddressMessage] },
        ]);
      }

      setBackupSigner(checksummedAddress);
      goto(SetupScreen.AgentSelection);
    },
    [form, setBackupSigner, goto],
  );

  const backupSigner = Form.useWatch('backupSigner', form);

  return (
    <CardFlex noBorder>
      <BackButton onPrev={() => goto(SetupScreen.SetupSeedPhrase)} />
      <SetupBackupTitle />

      <Flex vertical gap={10}>
        <FormFlex layout="vertical" form={form} onFinish={handleFinish}>
          <Form.Item
            name="backupSigner"
            label={<FormLabel>Enter Backup Wallet Address</FormLabel>}
            rules={[
              {
                required: true,
                len: 42,
                pattern: /^0x[a-fA-F0-9]{40}$/,
                type: 'string',
                message: invalidAddressMessage,
              },
            ]}
            required={false}
            labelCol={{ style: { paddingBottom: 4 } }}
          >
            <Input size="large" placeholder="0x..." />
          </Form.Item>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            disabled={!backupSigner}
          >
            Continue
          </Button>
        </FormFlex>

        <Text type="secondary" className="text-sm">
          Note that in the current version of the app, you will not be able to
          set up a backup wallet afterward. This functionality is coming soon.
        </Text>
      </Flex>
    </CardFlex>
  );
};
