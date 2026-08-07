import { Button } from 'antd';

import { SuccessOutlined } from '@/components/custom-icons';
import { Modal } from '@/components/ui';

type ConnectFirstRunModalProps = {
  open: boolean;
  onOpenProfile: () => void;
};

export const ConnectFirstRunModal = ({
  open,
  onOpenProfile,
}: ConnectFirstRunModalProps) => (
  <Modal
    open={open}
    size="medium"
    header={<SuccessOutlined />}
    title="Your agent is ready"
    description="Open the Agent Profile to configure and start your first session in Claude Code."
    // Non-dismissable: the CTA is the only way out. `closable` already defaults
    // to false; mask/ESC are inert only because no `onCancel` is passed, so pin
    // them explicitly rather than relying on that.
    maskClosable={false}
    keyboard={false}
    action={
      <Button
        type="primary"
        size="large"
        block
        className="mt-32"
        onClick={onOpenProfile}
      >
        Open Agent Profile
      </Button>
    }
  />
);
