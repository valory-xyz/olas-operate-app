import { CopyOutlined } from '@ant-design/icons';
import { Button, Card, Flex, message, Modal, Tag, Typography } from 'antd';
import { useCallback, useState } from 'react';

import { CustomAlert } from '@/components/Alert';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { copyToClipboard } from '@/utils/copyToClipboard';

import { SetupCreateHeader } from './SetupCreateHeader';

const { Text, Title } = Typography;

const SeedPhraseAlert = () => (
  <CustomAlert
    type="warning"
    showIcon
    message={
      <Text>
        Without seed phrase, access to your Pearl account will be lost forever,
        so keep it safe.
      </Text>
    }
  />
);

export const SetupSeedPhrase = () => {
  const { mnemonic, goto } = useSetup();
  const [hasCopied, setHasCopied] = useState(false);
  const [modal, contextHolder] = Modal.useModal();

  const handleCopy = useCallback(() => {
    copyToClipboard(mnemonic.join(' ')).then(() => {
      message.success('Seed phrase is copied!');
      setHasCopied(true);
    });
  }, [mnemonic]);

  const handleContinue = useCallback(() => {
    modal.confirm({
      title: 'Did you back up your seed phrase securely?',
      content: (
        <Flex vertical gap={8} className="mb-16">
          <Text>
            This is the only way to recover your account and restore your funds
            if access is lost.
          </Text>
          <Text>
            Ensure you have securely saved the seed phrase in a safe location
            before proceeding.
          </Text>
        </Flex>
      ),
      okText: 'Confirm & continue',
      cancelText: 'Cancel',
      onOk: () => goto(SetupScreen.SetupBackupSigner),
      icon: null,
    });
  }, [goto, modal]);

  return (
    <Card style={{ border: 'none' }}>
      <SetupCreateHeader />
      <Title level={3}>Back up seed phrase</Title>

      <Flex gap={16} vertical>
        <Text>
          Seed phrase is required to regain access to your account if you forget
          your password.
        </Text>
        <SeedPhraseAlert />

        <Flex gap={8} wrap="wrap" style={{ marginBottom: 8 }}>
          {mnemonic.map((word: string) => (
            <Tag
              key={word}
              style={{ width: 80, textAlign: 'center', fontSize: 14 }}
            >
              {word}
            </Tag>
          ))}
        </Flex>

        <Flex gap={16} vertical>
          <Button size="large" onClick={handleCopy} block>
            <CopyOutlined /> Copy to clipboard
          </Button>
          <Button
            disabled={!hasCopied}
            onClick={handleContinue}
            block
            type="primary"
            size="large"
          >
            Continue
          </Button>
        </Flex>
      </Flex>

      {contextHolder}
    </Card>
  );
};
