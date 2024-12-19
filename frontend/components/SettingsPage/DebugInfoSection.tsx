import { Button, Typography } from 'antd';
import { useCallback, useState } from 'react';

import { MODAL_WIDTH } from '@/constants/width';

import { CardSection } from '../styled/CardSection';
import { CustomModal } from '../styled/CustomModal';
import { DebugAddresses } from './DebugAddresses';

const { Text } = Typography;

export const DebugInfoSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const showModal = useCallback(() => setIsModalOpen(true), []);
  const handleCancel = useCallback(() => setIsModalOpen(false), []);

  return (
    <CardSection vertical gap={8} align="start" padding="24px">
      <Text strong>Debug data (for devs)</Text>
      <Button type="primary" ghost size="large" onClick={showModal}>
        Show debug data
      </Button>
      <CustomModal
        title="Debug data"
        open={isModalOpen}
        footer={null}
        width={MODAL_WIDTH}
        onCancel={handleCancel}
      >
        <DebugAddresses />
      </CustomModal>
    </CardSection>
  );
};
