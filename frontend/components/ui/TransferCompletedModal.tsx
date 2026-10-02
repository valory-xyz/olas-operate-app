import { Button } from 'antd';

import { SuccessOutlined } from '../custom-icons';
import { Modal } from './Modal';

type TransferCompletedModalProps = {
  onGoToPearlWallet: () => void;
};

export const TransferCompletedModal = ({
  onGoToPearlWallet,
}: TransferCompletedModalProps) => (
  <Modal
    header={<SuccessOutlined />}
    title="Transfer Completed!"
    description="Your funds have been deposited successfully."
    action={
      <Button
        type="primary"
        size="large"
        block
        className="mt-32"
        onClick={onGoToPearlWallet}
      >
        Go to Pearl Wallet
      </Button>
    }
  />
);
