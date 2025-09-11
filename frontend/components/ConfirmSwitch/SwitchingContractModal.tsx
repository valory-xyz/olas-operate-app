import { LoadingOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';

import { SuccessTickSvg } from '@/components/custom-icons/SuccessTick';
import { Modal } from '@/components/ui/Modal';
import { useYourWallet } from '@/components/YourWalletPage/useYourWallet';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { AddressZero } from '@/constants/address';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { generateName } from '@/utils/agentName';

const ModalHeader = ({
  isSwitchingContract,
}: {
  isSwitchingContract: boolean;
}) =>
  isSwitchingContract ? (
    <Spin indicator={<LoadingOutlined spin />} size="large" />
  ) : (
    <SuccessTickSvg />
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
  const agentName = generateName(serviceSafe?.address ?? AddressZero);
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
      header={<ModalHeader isSwitchingContract={isSwitchingContract} />}
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
