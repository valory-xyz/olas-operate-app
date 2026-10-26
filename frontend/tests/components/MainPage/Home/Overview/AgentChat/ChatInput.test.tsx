import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ChatInput } from '../../../../../../components/MainPage/Home/Overview/AgentChat/ChatInput';

type ChatInputProps = React.ComponentProps<typeof ChatInput>;

const renderInput = (overrides: Partial<ChatInputProps> = {}) => {
  const props: ChatInputProps = {
    text: 'Why?',
    onTextChange: jest.fn(),
    onSend: jest.fn(() => true),
    canSend: true,
    isMessagesOnly: false,
    onMessagesOnlyChange: jest.fn(),
    isBusyNoticeOpen: false,
    onBusyNoticeClose: jest.fn(),
    ...overrides,
  };
  render(<ChatInput {...props} />);
  return props;
};

const sendButton = () => screen.getByRole('button', { name: 'Send' });

describe('ChatInput Enter key', () => {
  const textarea = () => screen.getByRole('textbox', { name: 'Message' });

  it('sends on Enter', () => {
    const { onSend, onTextChange } = renderInput();

    fireEvent.keyDown(textarea(), { key: 'Enter' });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onTextChange).toHaveBeenCalledWith('');
  });

  it('does not send on the Enter that confirms an IME composition', () => {
    const { onSend } = renderInput();

    fireEvent.keyDown(textarea(), { key: 'Enter', isComposing: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('keeps the text when the message was not queued', () => {
    const { onTextChange } = renderInput({ onSend: jest.fn(() => false) });

    fireEvent.keyDown(textarea(), { key: 'Enter' });

    expect(onTextChange).not.toHaveBeenCalled();
  });
});

describe('ChatInput Send button', () => {
  it('sends on the first click', () => {
    const { onSend, onTextChange } = renderInput();

    fireEvent.click(sendButton());

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onTextChange).toHaveBeenCalledWith('');
  });

  it('does not send empty text', () => {
    const { onSend } = renderInput({ text: '   ' });

    fireEvent.click(sendButton());

    expect(onSend).not.toHaveBeenCalled();
  });

  it('closes the busy notice when it is dismissed', () => {
    jest.useFakeTimers();
    const { onBusyNoticeClose } = renderInput({ isBusyNoticeOpen: true });

    fireEvent.mouseLeave(sendButton());
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();

    expect(onBusyNoticeClose).toHaveBeenCalledTimes(1);
  });
});
