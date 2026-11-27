import { Button, Flex } from 'antd';
import Image from 'next/image';
import { TbPlus } from 'react-icons/tb';

import { Modal } from '@/components/ui';
import { COLOR } from '@/constants';
import { useConnectStakingAnnouncement } from '@/hooks/useConnectStakingAnnouncement';

const ConnectPlusOlas = () => (
  <Flex align="center" gap={16}>
    <Image
      src="/agent-connect-icon.png"
      alt="Connect agent"
      width={48}
      height={48}
    />
    <TbPlus size={16} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
    <Image src="/tokens/olas-icon.png" alt="OLAS" width={48} height={48} />
  </Flex>
);

/** "Staking for Connect agents" — shown once per user; see the hook. */
export const ConnectStakingAnnouncement = () => {
  const { isOpen, stake, dismiss } = useConnectStakingAnnouncement();

  if (!isOpen) return null;

  return (
    <Modal
      open
      size="medium"
      header={<ConnectPlusOlas />}
      title="Staking for Connect agents"
      description="Connect agents on Gnosis and Robinhood Chain can now be staked to become eligible for OLAS activity rewards. Staking is optional."
      // Answered only by its buttons, so it is never closed without being
      // marked as seen.
      maskClosable={false}
      keyboard={false}
      action={
        <Flex vertical gap={12} className="w-full mt-32">
          <Button type="primary" size="large" block onClick={stake}>
            Stake your Connect Agent
          </Button>
          <Button size="large" block onClick={dismiss}>
            Not Now
          </Button>
        </Flex>
      }
    />
  );
};
