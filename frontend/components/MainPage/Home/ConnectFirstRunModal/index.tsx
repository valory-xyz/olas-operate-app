import { CheckCircleFilled } from '@ant-design/icons';
import { Button } from 'antd';
import { LuArrowUpRight } from 'react-icons/lu';

import { Modal } from '@/components/ui';
import { COLOR } from '@/constants';

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
    header={
      <CheckCircleFilled style={{ fontSize: 80, color: COLOR.SUCCESS }} />
    }
    title="Your agent is ready"
    description="Open the Agent Profile to configure and start your first session in Claude Code."
    action={
      <Button
        type="primary"
        size="middle"
        className="mt-16"
        onClick={onOpenProfile}
        iconPosition="end"
        icon={<LuArrowUpRight />}
      >
        Open Agent Profile
      </Button>
    }
  />
);
