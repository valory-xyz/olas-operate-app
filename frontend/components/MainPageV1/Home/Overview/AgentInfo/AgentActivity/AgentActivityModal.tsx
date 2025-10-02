import type { CollapseProps } from 'antd';
import { Divider, Flex, Modal, Typography } from 'antd';

import { CurrentActionContainer, ModalCollapseItem } from './styles';

const { Text } = Typography;

type AgentActivityModalProps = {
  open: boolean;
  onClose: () => void;
  items: CollapseProps['items'];
  currentActionName?: string;
  currentActionDescription?: string;
};

export const AgentActivityModal = ({
  open,
  onClose,
  items,
  currentActionName,
  currentActionDescription,
}: AgentActivityModalProps) => {
  return (
    <Modal
      title="Agent Activity"
      open={open}
      onCancel={onClose}
      footer={null}
      closable
      maskClosable
    >
      <Flex vertical gap={8}>
        <Text style={{ fontSize: 14 }}>Current action</Text>
        <CurrentActionContainer vertical>
          {currentActionName && <Text strong>{currentActionName}</Text>}
          {currentActionDescription && (
            <Text style={{ fontSize: 14 }}>{currentActionDescription}</Text>
          )}
        </CurrentActionContainer>
        <Divider />
        <Text strong>History</Text>
        <ModalCollapseItem items={items} bordered={false} />
      </Flex>
    </Modal>
  );
};
