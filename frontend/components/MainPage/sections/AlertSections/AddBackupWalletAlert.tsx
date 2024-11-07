import { Flex, Typography } from 'antd';
import { isNil } from 'lodash';

import { Pages } from '@/enums/PageState';
import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';

import { CustomAlert } from '../../../Alert';

const { Text } = Typography;

export const AddBackupWalletAlert = () => {
  const { goto } = usePageState();
  const { backupSafeAddress, masterSafeOwners } = useMasterSafe();

  if (isNil(masterSafeOwners)) return null;
  if (backupSafeAddress) return null;

  return (
    <CustomAlert
      type="warning"
      fullWidth
      showIcon
      message={
        <Flex align="center" justify="space-between" gap={2}>
          <span>Add backup wallet</span>
          <Text
            className="pointer hover-underline text-primary"
            onClick={() => goto(Pages.AddBackupWalletViaSafe)}
          >
            See instructions
          </Text>
        </Flex>
      }
    />
  );
};
