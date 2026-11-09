import { Flex, Typography } from 'antd';

import { Alert, cardStyles } from '@/components/ui';

const { Text } = Typography;

/** The Pearl Safe's owners can't be read; the read keeps retrying. */
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

/** `BackupSignerUnavailableAlert` in place of a page card. */
export const BackupSignerUnavailable = () => (
  <Flex style={cardStyles}>
    <BackupSignerUnavailableAlert />
  </Flex>
);
