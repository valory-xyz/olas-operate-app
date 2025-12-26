import { Button, Checkbox, Flex, Modal } from 'antd';
import { useCallback, useState } from 'react';

import { GEMINI_API_URL, MODAL_WIDTH, PAGES } from '@/constants';
import { useElectronApi, usePageState, useServices } from '@/hooks';

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
  const electronApi = useElectronApi();
  const { selectedAgentType, selectedAgentConfig } = useServices();
  const { goto } = usePageState();

  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDoNotShowAgain = useCallback(
    (value: boolean) => {
      const key = `${selectedAgentType}.isProfileWarningDisplayed`;
      electronApi.store?.set?.(key, value);
      onClose;
    },
    [electronApi.store, selectedAgentType, onClose],
  );

  const handleProvideKey = useCallback(() => {
    handleDoNotShowAgain(dontShowAgain);
    goto(PAGES.UpdateAgentTemplate);
  }, [dontShowAgain, handleDoNotShowAgain, goto]);

  const handleProceed = useCallback(() => {
    handleDoNotShowAgain(dontShowAgain);
    onClose();
    onSkip();
  }, [dontShowAgain, handleDoNotShowAgain, onClose, onSkip]);

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

        <Flex align="center" gap={8}>
          <Checkbox onChange={(e) => setDontShowAgain(e.target.checked)}>
            {"Don't show again"}
          </Checkbox>
        </Flex>

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
