import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ChatInput } from '../../../../../../components/MainPage/Home/Overview/AgentChat/ChatInput';

jest.mock('../../../../../../components/ui', () => ({
  InfoTooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

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
    shouldShowCostNote: true,
    onCostNoteSeen: jest.fn(),
    ...overrides,
  };
  render(<ChatInput {...props} />);
  return props;
};

const sendButton = () => screen.getByRole('button', { name: 'Send' });
/** jsdom never finishes antd's open animation, so check the hidden class. */
const isCostNoteOpen = () => {
  const popover = screen
    .queryByText('Before your first message')
    ?.closest('.ant-popover');
  return !!popover && !popover.classList.contains('ant-popover-hidden');
};

describe('ChatInput cost note', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('closes without sending when dismissed, and shows again on the next Send', () => {
    const { onSend, onCostNoteSeen } = renderInput();

    fireEvent.click(sendButton());
    expect(isCostNoteOpen()).toBe(true);

    fireEvent.mouseLeave(sendButton());
    act(() => {
      jest.runAllTimers();
    });

    expect(isCostNoteOpen()).toBe(false);
    expect(onSend).not.toHaveBeenCalled();
    expect(onCostNoteSeen).not.toHaveBeenCalled();

    fireEvent.click(sendButton());
    act(() => {
      jest.runAllTimers();
    });

    expect(isCostNoteOpen()).toBe(true);
    expect(onSend).not.toHaveBeenCalled();
  });
});
