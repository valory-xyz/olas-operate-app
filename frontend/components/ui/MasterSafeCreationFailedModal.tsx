import { Button, Flex } from 'antd';

import { WarningOutlined } from '@/components/custom-icons';

import { Modal } from './Modal';

type MasterSafeCreationFailedModalProps = {
  onTryAgain: () => void;
  onContactSupport: () => void;
};

export const MasterSafeCreationFailedModal = ({
  onTryAgain,
  onContactSupport,
}: MasterSafeCreationFailedModalProps) => (
  <Modal
    header={<WarningOutlined />}
    title="Master Safe Creation Failed"
    description="Please try again in a few minutes."
    action={
      <Flex gap={16} vertical className="mt-24 w-full">
        <Button onClick={onTryAgain} type="primary" block size="large">
          Try Again
        </Button>
        <Button onClick={onContactSupport} type="default" block size="large">
          Contact Support
        </Button>
      </Flex>
    }
  />
);
