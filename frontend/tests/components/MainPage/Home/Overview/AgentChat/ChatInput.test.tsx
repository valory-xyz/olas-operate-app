import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ChatInput } from '../../../../../../components/MainPage/Home/Overview/AgentChat/ChatInput';

type ChatInputProps = React.ComponentProps<typeof ChatInput>;

const renderInput = (overrides: Partial<ChatInputProps> = {}) => {
  const props: ChatInputProps = {
    text: 'Why?',
    onTextChange: jest.fn(),
    onSend: jest.fn(() => true),
    availability: 'ready',
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

  it('shows the usual placeholder when the agent is not starting', () => {
    renderInput();

    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAttribute(
      'placeholder',
      'Ask your agent or give it guidance...',
    );
  });

  it('shows the starting placeholder while the agent is starting', () => {
    renderInput({ availability: 'starting' });

    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAttribute(
      'placeholder',
      "Your agent is starting. You can chat once it's ready.",
    );
  });

  it('disables the input and Send while the agent is starting', () => {
    renderInput({ availability: 'starting' });

    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled();
    expect(sendButton()).toBeDisabled();
  });

  it('disables the input with the usual placeholder when the agent is unavailable', () => {
    renderInput({ availability: 'unavailable' });

    const textarea = screen.getByRole('textbox', { name: 'Message' });
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute(
      'placeholder',
      'Ask your agent or give it guidance...',
    );
    expect(sendButton()).toBeDisabled();
  });

  it('does not send empty text', () => {
    const { onSend } = renderInput({ text: '   ' });

    fireEvent.click(sendButton());

    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows no message cost on hover', () => {
    jest.useFakeTimers();
    renderInput();

    document.querySelectorAll('svg').forEach((icon) => {
      fireEvent.mouseEnter(icon);
    });
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();

    expect(document.body).not.toHaveTextContent(/\$0\.01|costs|paid from/);
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
