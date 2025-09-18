import { Button, Flex, Modal, Typography } from 'antd';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

const { Text } = Typography;

type SomeFundsMaybeLockedModal = {
  onNext: () => void;
  onCancel: () => void;
};

export const SomeFundsMaybeLockedModal = ({
  onNext,
  onCancel,
}: SomeFundsMaybeLockedModal) => {
  const { goto } = usePageState();

  return (
    <Modal
      open
      title="Some funds may be locked"
      onCancel={onCancel}
      footer={null}
      centered
    >
      <Text>Some Funds May Be Locked</Text>
      <Flex vertical gap={8} className="mb-32 mt-12">
        <Text>Your agent may have funds in external smart contracts.</Text>
        <Text>
          Pearl doesn’t have access to those funds — you need to initiate their
          withdrawal by instructing the agent to do so via the Agent Profile
          page.
        </Text>
        <Text>
          Make sure to check your agent has withdrawn all its funds before
          proceeding.
        </Text>
      </Flex>
      <Flex gap={16}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onNext}>I’ve Withdrawn Locked Funds</Button>
        <Button onClick={() => goto(Pages.Main)} type="primary" ghost>
          Withdraw Locked Funds
        </Button>
      </Flex>
    </Modal>
  );
};
