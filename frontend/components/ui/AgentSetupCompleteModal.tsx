import { Button, Flex, Modal, ModalProps, Typography } from 'antd';

import { SuccessTickSvg } from '@/components/custom-icons/successTick';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

const { Title, Text } = Typography;

const MODAL_STYLES: ModalProps['styles'] = {
  content: {
    width: '452px',
    padding: '32px',
    borderRadius: '12px',
  },
};

export const AgentSetupCompleteModal = () => {
  const { goto } = usePageState();
  return (
    <Modal open centered footer={null} styles={MODAL_STYLES} closable={false}>
      <Flex vertical align="center">
        <SuccessTickSvg />
        <Title level={5} className="mt-32 mb-12">
          Setup Complete
        </Title>
        <Text type="secondary">
          Your autonomous AI agent is ready to work for you.
        </Text>
        <Button
          type="primary"
          size="large"
          block
          className="mt-32"
          onClick={() => goto(Pages.Main)}
        >
          View Agent
        </Button>
      </Flex>
    </Modal>
  );
};
