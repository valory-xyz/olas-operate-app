import { Button, Flex, Modal } from 'antd';
import { useCallback } from 'react';

import { GEMINI_API_URL, MODAL_WIDTH, PAGES } from '@/constants';
import { usePageState, useServices } from '@/hooks';

type UnlockChatUiAlertProps = {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
};

export const UnlockChatUiAlert = ({
  isOpen,
  onClose,
  onSkip,
}: UnlockChatUiAlertProps) => {
  const { selectedAgentConfig } = useServices();
  const { goto } = usePageState();

  const handleProvideKey = useCallback(() => {
    onClose();
    goto(PAGES.UpdateAgentTemplate);
  }, [onClose, goto]);

  const handleProceed = useCallback(() => {
    onClose();
    onSkip();
  }, [onClose, onSkip]);

  return (
    <Modal
      title="Provide Gemini API Key"
      open={isOpen}
      onCancel={onClose}
      width={MODAL_WIDTH}
      footer={null}
    >
      <Flex vertical gap={20}>
        <div>
          To unlock the full functionality of {selectedAgentConfig.displayName}{' '}
          agent profile, a Gemini API key is required. You can get a free Gemini
          API key through the{' '}
          <a target="_blank" rel="noopener noreferrer" href={GEMINI_API_URL}>
            Google AI Studio
          </a>
          .
        </div>

        <Flex gap={8}>
          <Button onClick={handleProceed}>Proceed anyway</Button>
          <Button type="primary" onClick={handleProvideKey}>
            Provide Gemini API key
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
};
