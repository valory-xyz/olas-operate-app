import { Button, Flex, Input, Popover, Typography } from 'antd';
import { KeyboardEvent, useState } from 'react';
import { LuMessageCircleMore } from 'react-icons/lu';
import { TbArrowUp, TbX } from 'react-icons/tb';
import styled from 'styled-components';

import { InfoTooltip } from '@/components/ui';
import { COLOR } from '@/constants';

import { CHAT_COPY } from './constants';

const { Text } = Typography;

const InputBox = styled(Flex)<{ $isDisabled: boolean }>`
  margin: 0 4px 4px;
  padding: 12px 8px 8px 16px;
  border-radius: 12px;
  border: 1px solid ${COLOR.BORDER_GRAY};
  background: ${COLOR.BACKGROUND};
  opacity: ${({ $isDisabled }) => ($isDisabled ? 0.6 : 1)};

  &:focus-within {
    border-color: ${COLOR.PURPLE_2};
  }

  textarea.ant-input {
    padding: 0;
    background: transparent;
  }
`;

const MessagesOnlyToggle = styled(Button)<{ $isOn: boolean }>`
  padding: 0 8px;
  color: ${({ $isOn }) => ($isOn ? COLOR.PURPLE : COLOR.TEXT_NEUTRAL_TERTIARY)};
  background: ${({ $isOn }) => ($isOn ? COLOR.PURPLE_LIGHT_3 : 'transparent')};
`;

const PopoverContent = styled(Flex)`
  max-width: 280px;
`;

type ChatInputProps = {
  text: string;
  onTextChange: (text: string) => void;
  /** Sends the text; resolves to whether it was sent. */
  onSend: () => boolean;
  /** The agent can answer now (deployed and alive). */
  canSend: boolean;
  isMessagesOnly: boolean;
  onMessagesOnlyChange: (isOn: boolean) => void;
  isBusyNoticeOpen: boolean;
  onBusyNoticeClose: () => void;
  shouldShowCostNote: boolean;
  onCostNoteSeen: () => void;
};

export const ChatInput = ({
  text,
  onTextChange,
  onSend,
  canSend,
  isMessagesOnly,
  onMessagesOnlyChange,
  isBusyNoticeOpen,
  onBusyNoticeClose,
  shouldShowCostNote,
  onCostNoteSeen,
}: ChatInputProps) => {
  const [isCostNoteOpen, setIsCostNoteOpen] = useState(false);
  const canSubmit = canSend && text.trim().length > 0;

  const send = () => {
    if (!canSubmit) return;
    if (shouldShowCostNote) {
      setIsCostNoteOpen(true);
      return;
    }
    if (onSend()) onTextChange('');
  };

  const confirmCostNote = () => {
    setIsCostNoteOpen(false);
    onCostNoteSeen();
    if (onSend()) onTextChange('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    send();
  };

  return (
    <InputBox vertical gap={12} $isDisabled={!canSend}>
      <Input.TextArea
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={CHAT_COPY.placeholder}
        autoSize={{ minRows: 1, maxRows: 4 }}
        variant="borderless"
        disabled={!canSend}
        aria-label="Message"
      />
      <Flex justify="space-between" align="center">
        <MessagesOnlyToggle
          type="text"
          size="small"
          $isOn={isMessagesOnly}
          icon={<LuMessageCircleMore />}
          aria-pressed={isMessagesOnly}
          onClick={() => onMessagesOnlyChange(!isMessagesOnly)}
        >
          {CHAT_COPY.messagesOnly}
          {isMessagesOnly && <TbX />}
        </MessagesOnlyToggle>
        <Flex gap={12} align="center">
          <InfoTooltip placement="topRight">
            {CHAT_COPY.costTooltip}
          </InfoTooltip>
          <Popover
            open={isBusyNoticeOpen || isCostNoteOpen}
            placement="topRight"
            onOpenChange={(isOpen) => {
              if (isOpen) return;
              onBusyNoticeClose();
              setIsCostNoteOpen(false);
            }}
            content={
              isCostNoteOpen ? (
                <PopoverContent vertical gap={8}>
                  <Text strong>{CHAT_COPY.costNoteTitle}</Text>
                  <Text className="text-sm">{CHAT_COPY.costNoteBody}</Text>
                  <Button
                    type="primary"
                    size="small"
                    className="ml-auto"
                    onClick={confirmCostNote}
                  >
                    {CHAT_COPY.costNoteConfirm}
                  </Button>
                </PopoverContent>
              ) : (
                <PopoverContent>
                  <Text>{CHAT_COPY.busy}</Text>
                </PopoverContent>
              )
            }
          >
            <Button
              type="primary"
              size="small"
              icon={<TbArrowUp />}
              aria-label="Send"
              disabled={!canSubmit}
              onClick={send}
            />
          </Popover>
        </Flex>
      </Flex>
    </InputBox>
  );
};
