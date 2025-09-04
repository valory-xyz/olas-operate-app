import { Button } from 'antd';

import { SuccessTickSvg } from '@/components/custom-icons/SuccessTick';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { Modal } from './Modal';

export const AgentSetupCompleteModal = () => {
  const { goto } = usePageState();
  return (
    <Modal
      header={<SuccessTickSvg />}
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
