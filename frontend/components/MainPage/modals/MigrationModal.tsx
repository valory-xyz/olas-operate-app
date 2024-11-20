import { Button, Flex, Modal, Typography } from 'antd';
import Image from 'next/image';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { MODAL_WIDTH } from '@/constants/width';
import { useStakingProgram } from '@/hooks/useStakingProgram';

const { Title, Text, Link } = Typography;

type MigrationModalProps = { open: boolean; onClose: () => void };
export const MigrationSuccessModal = ({
  open,
  onClose,
}: MigrationModalProps) => {
  const { activeStakingProgramMeta } = useStakingProgram();

  // Close modal if no active staking program, migration doesn't apply to non-stakers
  if (!activeStakingProgramMeta) {
    onClose();
    return null;
  }

  return (
    <Modal
      width={MODAL_WIDTH}
      open={open}
      onCancel={onClose}
      footer={[
        <Button
          key="ok"
          type="primary"
          block
          size="large"
          className="mt-8"
          onClick={onClose}
        >
          Got it
        </Button>,
      ]}
    >
      <Flex gap={8} vertical>
        {/* Robot head */}
        <Flex align="center" justify="center">
          <Image
            src="/splash-robot-head.png"
            width={100}
            height={100}
            alt="Pearl agent head"
          />
        </Flex>
        <Title level={4}>You switched staking contract successfully!</Title>
        <Text>
          Your agent is now staked on {activeStakingProgramMeta.name}.
        </Text>
        {/* TODO: Add relevant block explorer domain */}
        <Link href="#">
          View full contract details {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </Link>
      </Flex>
    </Modal>
  );
};
