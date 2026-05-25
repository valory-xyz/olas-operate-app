import { Button } from 'antd';

import { Modal } from '@/components/ui';

type DecommissioningUnavailableModalProps = {
  open: boolean;
  onClose: () => void;
  countdownDisplay: string;
};

export const DecommissioningUnavailableModal = ({
  open,
  onClose,
  countdownDisplay,
}: DecommissioningUnavailableModalProps) => (
  <Modal
    open={open}
    onCancel={onClose}
    closable
    title="Decommissioning Unavailable"
    description={`Your agent hasn't reached the minimum duration of staking. You'll be able to decommission in: ${countdownDisplay}`}
    action={
      <Button onClick={onClose} type="primary" block size="large">
        Close
      </Button>
    }
  />
);
