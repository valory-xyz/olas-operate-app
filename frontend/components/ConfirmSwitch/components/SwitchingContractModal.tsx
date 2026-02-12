import { Button, Spin } from 'antd';
import { useCallback, useMemo } from 'react';

import {
  LoadingOutlined,
  SuccessOutlined,
  WarningOutlined,
} from '@/components/custom-icons';
import { Modal } from '@/components/ui';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { PAGES } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';
import { usePageState, useServices } from '@/hooks';

type SwitchingContractStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';

const ModalHeader = ({ status }: { status: SwitchingContractStatus }) => {
  if (status === 'IN_PROGRESS')
    return <Spin indicator={<LoadingOutlined />} size="large" />;
  if (status === 'COMPLETED') return <SuccessOutlined />;
  if (status === 'ERROR') return <WarningOutlined />;
};

type SwitchingContractModalProps = {
  status: SwitchingContractStatus;
  onClose: () => void;
  stakingProgramIdToMigrateTo: string;
};

export const SwitchingContractModal = ({
  status,
  onClose,
  stakingProgramIdToMigrateTo,
}: SwitchingContractModalProps) => {
  const { goto } = usePageState();
  const { toggleSupportModal } = useSupportModal();
  const { selectedAgentConfig, selectedAgentName } = useServices();

  const handleContactSupport = useCallback(() => {
    onClose();
    toggleSupportModal();
  }, [onClose, toggleSupportModal]);

  const modalProps = useMemo(() => {
    if (status === 'IN_PROGRESS') {
      return {
        title: 'Switching in Progress',
        description:
          'Your agent is switching contracts. It usually takes up to 5 min. Please keep the app open until the process is complete.',
      };
    }

    if (status === 'COMPLETED') {
      const stakingProgramMeta =
        STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
          stakingProgramIdToMigrateTo
        ];

      return {
        title: 'Contract Switched Successfully!',
        description: `Your ${selectedAgentConfig.displayName} agent ${selectedAgentName ?? 'N/A'} is now staked on ${stakingProgramMeta?.name} staking contract.`,
        action: (
          <Button
            type="primary"
            block
            onClick={() => goto(PAGES.Main)}
            className="mt-32"
          >
            View Agent
          </Button>
        ),
      };
    }

    if (status === 'ERROR') {
      return {
        title: 'Switching Error',
        description:
          'An error occurred during switching contracts. Please try again or contact support.',
        closable: true,
        onCancel: onClose,
        action: (
          <Button className="mt-16" onClick={handleContactSupport}>
            Contact support
          </Button>
        ),
      };
    }
  }, [
    goto,
    selectedAgentConfig.displayName,
    selectedAgentConfig.evmHomeChainId,
    stakingProgramIdToMigrateTo,
    status,
    onClose,
    handleContactSupport,
    selectedAgentName,
  ]);

  return <Modal header={<ModalHeader status={status} />} {...modalProps} />;
};
