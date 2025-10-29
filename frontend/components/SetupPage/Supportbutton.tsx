import { Button } from 'antd';
import { TbHelpSquareRounded } from 'react-icons/tb';
import styled from 'styled-components';

import { Tooltip } from '@/components/ui';
import { useModals } from '@/hooks';

const SupportButtonContainer = styled.div`
  position: absolute;
  bottom: 32px;
  right: 32px;
`;

export const SupportButton = () => {
  const { setSupportModalOpen } = useModals();

  const openSupportModal = () => {
    setSupportModalOpen(true);
  };

  return (
    <Tooltip title="Contact support" placement="left">
      <SupportButtonContainer>
        <Button
          size="large"
          icon={<TbHelpSquareRounded size={20} />}
          onClick={openSupportModal}
        ></Button>
      </SupportButtonContainer>
    </Tooltip>
  );
};
