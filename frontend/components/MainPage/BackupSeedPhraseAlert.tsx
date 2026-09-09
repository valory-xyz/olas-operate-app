import { Button, Flex, Typography } from 'antd';
import { TbShieldHalfFilled } from 'react-icons/tb';

import { PAGES } from '@/constants';
import {
  useMnemonicExists,
  usePageState,
  useRecoveryPhraseBackup,
} from '@/hooks';

import { Alert } from '../ui';

const { Text } = Typography;

export const BackupSeedPhraseAlert = () => {
  const { goto: gotoPage } = usePageState();
  const { isBackedUp } = useRecoveryPhraseBackup();
  const { mnemonicExists } = useMnemonicExists();

  // Don't show alert if mnemonic doesn't exist or if already backed up
  if (!mnemonicExists || isBackedUp) return null;

  return (
    <Alert
      type="warning"
      className="mt-auto mb-16"
      showIcon
      customIcon={<TbShieldHalfFilled size={20} />}
      message={
        <Flex vertical gap={10} align="flex-start">
          <Text className="text-sm">
            Back up your Secret Recovery Phrase to never lose access.
          </Text>
          <Button
            type="default"
            size="small"
            onClick={() => gotoPage(PAGES.Settings)}
          >
            Back Up Recovery Phrase
          </Button>
        </Flex>
      }
    />
  );
};
