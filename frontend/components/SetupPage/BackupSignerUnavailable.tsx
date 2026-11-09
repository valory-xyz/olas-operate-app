import { Flex, Typography } from 'antd';

import { Alert, BackButton, cardStyles } from '@/components/ui';

const { Text } = Typography;

/** The wallets, or the Pearl Safe owners the backup signer needs, can't be read; the reads keep retrying. */
export const BackupSignerUnavailableAlert = () => (
  <Alert
    type="warning"
    showIcon
    message={
      <Text className="text-sm">
        Couldn&apos;t check your backup wallet. Pearl keeps retrying — check
        your connection.
      </Text>
    }
  />
);

/** `BackupSignerUnavailableAlert` in place of a page card, with the page's Back. */
export const BackupSignerUnavailable = ({ onBack }: { onBack: () => void }) => (
  <Flex style={cardStyles} vertical gap={16}>
    <BackButton onPrev={onBack} />
    <BackupSignerUnavailableAlert />
  </Flex>
);
