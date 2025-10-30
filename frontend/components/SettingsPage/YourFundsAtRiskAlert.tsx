import { Button, Flex, Skeleton, Typography } from 'antd';
import { TbExternalLink } from 'react-icons/tb';
import { useToggle } from 'usehooks-ts';

import { Alert, Modal } from '@/components/ui';
import {
  AllEvmChainIdMap,
  DISCORD_TICKET_URL,
  EvmChainIdMap,
} from '@/constants';
import { useMasterWalletContext, useServices } from '@/hooks';

const { Text } = Typography;

/**
 * update as needed; check https://app.safe.global/new-safe/create for prefixes
 */
const safeChainPrefix = {
  [AllEvmChainIdMap.Ethereum]: 'eth',
  [EvmChainIdMap.Base]: 'base',
  [EvmChainIdMap.Optimism]: 'oeth',
  [EvmChainIdMap.Gnosis]: 'gno',
  [EvmChainIdMap.Mode]: '', // TODO: provide correct prefix once mode is supported on safe
};

type AddBackupWalletAlertProps = {
  open: boolean;
  onToggleOpen: () => void;
};

const AddBackupWalletAlert = ({
  open,
  onToggleOpen,
}: AddBackupWalletAlertProps) => {
  const { masterSafes } = useMasterWalletContext();
  const {
    selectedAgentConfig: { evmHomeChainId },
  } = useServices();

  const masterSafe = masterSafes?.find(
    ({ evmChainId: chainId }) => evmHomeChainId === chainId,
  );

  const safePrefix =
    masterSafe?.evmChainId && safeChainPrefix[masterSafe.evmChainId];

  return (
    <Modal
      title="Add Backup Wallet via Safe"
      description={
        <>
          <Flex vertical gap={16}>
            <Flex vertical gap={4}>
              <Text className="secondary">
                Manually add backup wallet via Safe interface:
              </Text>
              {masterSafe?.address ? (
                <a
                  target="_blank"
                  className="flex align-center"
                  href={`https://app.safe.global/settings/setup?safe=${safePrefix}:${masterSafe.address}`}
                >
                  Open Safe interface <TbExternalLink className="ml-4" />
                </a>
              ) : (
                <Skeleton.Input style={{ width: 200 }} />
              )}
            </Flex>

            <Flex vertical gap={4}>
              <Text type="secondary">Not sure how?</Text>
              <Flex align="center" gap={4}></Flex>
              <a
                target="_blank"
                className="flex align-center"
                href={DISCORD_TICKET_URL}
              >
                Get community assistance via Discord{' '}
                <TbExternalLink className="ml-4" />
              </a>
            </Flex>
          </Flex>
        </>
      }
      closable
      onCancel={onToggleOpen}
      open={open}
      size="small"
    />
  );
};

export const YourFundsAtRiskAlert = () => {
  const [open, toggleOpen] = useToggle(false);

  return (
    <>
      <Alert
        type="warning"
        className="mt-16"
        showIcon
        message={
          <Flex vertical gap={8} align="flex-start">
            <span className="font-weight-600">Your funds are at risk!</span>
            <span>
              Add a backup wallet to allow you to retrieve funds if you lose
              your password.
            </span>
            <Button onClick={toggleOpen}>See instructions</Button>
          </Flex>
        }
      />
      <AddBackupWalletAlert open={open} onToggleOpen={toggleOpen} />
    </>
  );
};
