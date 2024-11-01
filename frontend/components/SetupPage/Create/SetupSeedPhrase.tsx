import { CopyOutlined } from '@ant-design/icons';
import { Button, Card, Flex, message, Tag, Typography } from 'antd';

import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { copyToClipboard } from '@/utils/copyToClipboard';

import { SetupCreateHeader } from './SetupCreateHeader';

export const SetupSeedPhrase = () => {
  const { mnemonic, goto } = useSetup();

  const handleNext = () => {
    goto(SetupScreen.SetupBackupSigner);
  };

  return (
    <Card>
      <SetupCreateHeader prev={SetupScreen.SetupPassword} disabled={true} />
      <Typography.Title level={3}>Back up seed phrase</Typography.Title>
      <Flex gap={10} vertical>
        <Typography.Text>
          Seed phrase is needed to regain access to your account if you forget
          the password.
        </Typography.Text>
        <Flex gap={10} wrap="wrap">
          {mnemonic.map((word: string) => (
            <Tag key={word}>{word}</Tag>
          ))}
        </Flex>
        <Flex gap={10}>
          <Button
            size="large"
            onClick={() =>
              copyToClipboard(mnemonic.join(' ')).then(() =>
                message.success('Seed phrase is copied!'),
              )
            }
          >
            <CopyOutlined /> Copy to clipboard
          </Button>
          <Button type="primary" size="large" onClick={handleNext}>
            Continue
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};
