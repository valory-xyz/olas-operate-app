import {
  Button,
  Card,
  Flex,
  message,
  Modal,
  Tag as AntDTag,
  Typography,
} from 'antd';
import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { MODAL_WIDTH_V1 } from '@/constants/width';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { copyToClipboard } from '@/utils/copyToClipboard';

const { Text, Title } = Typography;

const Tag = styled(AntDTag)`
  background-color: ${COLOR.V1_GRAY_1};
  text-align: center;
`;

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
      okText: 'Confirm and Continue',
      cancelText: 'Cancel',
      onOk: () => goto(SetupScreen.SetupBackupSigner),
      icon: null,
      centered: true,
      width: MODAL_WIDTH_V1,
    });
  }, [goto, modal]);

  return (
    <Card style={{ border: 'none' }}>
      <Title level={3}>Back up seed phrase</Title>

      <Flex gap={32} vertical>
        <Text type="secondary">
          Seed phrase is a master key to your Pearl wallet. It’s needed to
          regain access to your account if you forgot the password. Copy the
          seed phrase and store in a secure location.
        </Text>

        <Flex gap={12} wrap="wrap" style={{ marginBottom: 8 }}>
          {mnemonic.map((word: string) => (
            <Tag key={word} bordered={false}>
              {word}
            </Tag>
          ))}
        </Flex>

        <Flex gap={16}>
          <Button size="large" onClick={handleCopy} block>
            Copy to clipboard
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
