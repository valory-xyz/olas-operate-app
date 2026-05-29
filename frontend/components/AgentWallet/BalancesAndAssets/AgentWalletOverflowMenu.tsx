import { Dropdown } from 'antd';
import { useState } from 'react';
import { TbDots } from 'react-icons/tb';
import styled from 'styled-components';

import { COLOR } from '@/constants';
import { useStakingContractCountdown } from '@/hooks';
import {
  ServiceStakingDetails,
  StakingContractDetails,
} from '@/types/Autonolas';
import { Maybe } from '@/types/Util';

import { DecommissioningUnavailableModal } from '../Decommission/DecommissioningUnavailableModal';

const OverflowMenuButton = styled.span`
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  color: ${COLOR.TEXT_NEUTRAL_SECONDARY};
  &:hover {
    color: ${COLOR.TEXT_NEUTRAL_TERTIARY};
    background-color: ${COLOR.GRAY_3};
  }
`;

type AgentWalletOverflowMenuProps = {
  onDecommission: () => void;
  isServiceStakedForMinimumDuration: boolean;
  selectedStakingContractDetails: Maybe<
    Partial<StakingContractDetails & ServiceStakingDetails>
  >;
};

export const AgentWalletOverflowMenu = ({
  onDecommission,
  isServiceStakedForMinimumDuration,
  selectedStakingContractDetails,
}: AgentWalletOverflowMenuProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { countdownDisplay } = useStakingContractCountdown(
    selectedStakingContractDetails,
  );

  const handleDecommissionClick = () => {
    if (!isServiceStakedForMinimumDuration) {
      setIsModalOpen(true);
      return;
    }
    onDecommission();
  };

  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'decommission',
              label: 'Decommission Agent',
              onClick: handleDecommissionClick,
            },
          ],
        }}
      >
        <OverflowMenuButton role="button" aria-label="More actions">
          <TbDots size={20} />
        </OverflowMenuButton>
      </Dropdown>

      <DecommissioningUnavailableModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        countdownDisplay={countdownDisplay}
      />
    </>
  );
};
