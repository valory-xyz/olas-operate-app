import { SuccessTickSvg } from '@/components/custom-icons/successTick';
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
      actionButtonText="View Agent"
      actionButtonOnClick={() => goto(Pages.Main)}
    />
  );
};
