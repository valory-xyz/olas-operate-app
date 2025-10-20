import { Button, Spin } from 'antd';

import { LoadingOutlined } from '@/components/custom-icons';
import { SuccessOutlined } from '@/components/custom-icons/SuccessOutlined';
import { Modal } from '@/components/ui/Modal';
import { useYourWallet } from '@/components/YourWalletPage/useYourWallet';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { generateName } from '@/utils/agentName';

const ModalHeader = ({ isLoading }: { isLoading: boolean }) =>
  isLoading ? (
    <Spin indicator={<LoadingOutlined />} size="large" />
  ) : (
    <SuccessOutlined />
  );

type SwitchingContractModalProps = {
  isSwitchingContract: boolean;
  stakingProgramIdToMigrateTo: string;
};

export const SwitchingContractModal = ({
  isSwitchingContract,
  stakingProgramIdToMigrateTo,
}: SwitchingContractModalProps) => {
  const { goto } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { serviceSafe } = useYourWallet();
  const agentName = serviceSafe?.address
    ? generateName(serviceSafe?.address)
    : '-';
  const stakingProgramMeta =
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
      stakingProgramIdToMigrateTo
    ];

  const title = isSwitchingContract
    ? 'Switching in Progress'
    : 'Contract Switched Successfully!';
  const description = isSwitchingContract
    ? 'Your agent is switching contracts. It usually takes up to 5 min. Please keep the app open until the process is complete.'
    : `Your ${selectedAgentConfig.displayName} ${agentName} is now staked on ${stakingProgramMeta?.name} staking contract.`;

  return (
    <Modal
      header={<ModalHeader isLoading={isSwitchingContract} />}
      title={title}
      description={description}
      action={
        isSwitchingContract ? null : (
          <Button
            type="primary"
            block
            onClick={() => goto(Pages.Main)}
            className="mt-32"
          >
            View Agent
          </Button>
        )
      }
    />
  );
};
