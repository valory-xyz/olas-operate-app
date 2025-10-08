import { Button } from 'antd';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { SuccessOutlined } from '../custom-icons';
import { Modal } from './Modal';

export const AgentSetupCompleteModal = () => {
  const { goto } = usePageState();
  return (
    <Modal
      header={<SuccessOutlined />}
      title="Setup Complete"
      description="Your autonomous AI agent is ready to work for you."
      action={
        <Button
          type="primary"
          size="large"
          block
          className="mt-32"
          onClick={() => goto(Pages.Main)}
        >
          View Agent
        </Button>
      }
    />
  );
};
