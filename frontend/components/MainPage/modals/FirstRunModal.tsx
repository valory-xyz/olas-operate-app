import { Button, Flex, Modal, Typography } from 'antd';
import Image from 'next/image';
import { FC } from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { MODAL_WIDTH } from '@/constants/width';
import { TokenSymbol } from '@/enums/Token';
import { useServices } from '@/hooks/useServices';
import { useStakingProgram } from '@/hooks/useStakingProgram';

const { Title, Paragraph } = Typography;

type FirstRunModalProps = { open: boolean; onClose: () => void };

export const FirstRunModal: FC<FirstRunModalProps> = ({ open, onClose }) => {
  const { selectedAgentConfig } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const { activeStakingProgramId } = useStakingProgram();

  if (!open) return null;
  if (!activeStakingProgramId) return null;

  const requiredStakedOlas =
    STAKING_PROGRAMS[homeChainId][activeStakingProgramId]?.stakingRequirements[
      TokenSymbol.OLAS
    ];

  return (
    <Modal
      open={open}
      width={MODAL_WIDTH}
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
      <Flex align="center" justify="center">
        <Image
          src="/splash-robot-head.png"
          width={100}
          height={100}
          alt="OLAS logo"
        />
      </Flex>
      <Title level={5} className="mt-12 text-center">
        {`Your agent is running and you've staked ${requiredStakedOlas} OLAS!`}
      </Title>
      <Paragraph>Your agent is working towards earning rewards.</Paragraph>
      <Paragraph>
        Pearl is designed to make it easy for you to earn staking rewards every
        day. Simply leave the app and agent running in the background for ~1hr a
        day.
      </Paragraph>
    </Modal>
  );
};
