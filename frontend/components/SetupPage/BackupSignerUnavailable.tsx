import { Flex, Typography } from 'antd';

import { Alert, cardStyles } from '@/components/ui';

const { Text } = Typography;

export const BACKUP_SIGNER_UNAVAILABLE =
  "Couldn't check your backup wallet. Pearl keeps retrying — check your connection.";

/** Shown while the Pearl Safe's owners can't be read; the read keeps retrying. */
export const BackupSignerUnavailable = () => (
  <Flex style={cardStyles}>
    <Alert
      type="warning"
      showIcon
      message={<Text className="text-sm">{BACKUP_SIGNER_UNAVAILABLE}</Text>}
    />
  </Flex>
);
