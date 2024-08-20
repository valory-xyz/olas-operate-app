import { CopyOutlined } from '@ant-design/icons';
import { Button, Flex, message, Tag, Typography } from 'antd';

import { SetupScreen } from '@/enums/SetupScreen';
import { useSetupPage } from '@/hooks/useSetupPage';
import { copyToClipboard } from '@/utils/copyToClipboard';

import { CardFlex } from '../../styled/CardFlex';
import { SetupCreateHeader } from './SetupCreateHeader';

export const SetupSeedPhrase = () => {
  const { mnemonic, goto } = useSetupPage();

  const handleNext = () => {
    goto(SetupScreen.SetupBackupSigner);
  };

  return (
    <CardFlex gap={10}>
      <SetupCreateHeader prev={SetupScreen.SetupPassword} disabled={true} />
      <Typography.Title level={3}>Back up seed phrase</Typography.Title>
      <Typography.Text>
        Seed phrase is needed to regain access to your account if you forget the
        password.
      </Typography.Text>
      <Flex gap={10} wrap="wrap">
        {mnemonic.map((word: string) => (
          <Tag key={word}>{word}</Tag>
        ))}
      </Flex>
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
    </CardFlex>
  );
};
