import { Button, Flex } from 'antd';

import { Modal } from '@/components/ui/Modal';

type ArchiveAgentModalProps = {
  agentName: string | null;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ArchiveAgentModal = ({
  agentName,
  open,
  onConfirm,
  onCancel,
}: ArchiveAgentModalProps) => {
  if (!open) return null;

  return (
    <Modal
      title="Archive agent"
      description={`${agentName} will be removed from your active agents and you won't be able to run it while it's archived. You can restore it anytime.`}
      size="small"
      action={
        <Flex gap={8} justify="flex-end" className="mt-24 w-full">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" onClick={onConfirm}>
            Archive Agent
          </Button>
        </Flex>
      }
    />
  );
};
