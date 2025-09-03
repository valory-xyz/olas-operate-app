import { Flex, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';

import { Pages } from '@/enums/Pages';
import { useMultisig } from '@/hooks/useMultisig';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useMasterWalletContext } from '@/hooks/useWallet';

import { CustomAlert } from '../../../Alert';

const { Text } = Typography;

export const AddBackupWalletAlert = () => {
  const { goto } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { masterSafes, masterEoa } = useMasterWalletContext();
  const { ownersIsFetched: masterSafeOwnersIsFetched, backupOwners } =
    useMultisig(
      masterSafes?.find((masterSafe) => {
        return masterSafe.evmChainId === selectedAgentConfig.evmHomeChainId;
      }),
    );

  if (!masterSafeOwnersIsFetched) return null;
  if (selectedAgentConfig.isUnderConstruction) return null;

  if (isNil(backupOwners)) return null;

  const hasNoBackupOwners = isEmpty(
    backupOwners.filter(
      (owner) => !isNil(masterEoa) && owner === masterEoa.address,
    ),
  );
  if (hasNoBackupOwners) return null;

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
