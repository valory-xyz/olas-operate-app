import { fireEvent, render, screen } from '@testing-library/react';

import { ConnectSessionAlert } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/ConnectSessionAlert';
import { CLAUDE_DOWNLOAD_URL } from '../../../../../../constants';
import { useConnectSession } from '../../../../../../hooks';

jest.mock('../../../../../../hooks', () => ({
  useConnectSession: jest.fn(),
}));

const mockUseConnectSession = useConnectSession as jest.Mock;

const setup = (over: Record<string, unknown> = {}) => {
  mockUseConnectSession.mockReturnValue({
    showAlert: true,
    errorKind: 'launch-failed',
    isLaunching: false,
    retry: jest.fn(),
    dismiss: jest.fn(),
    ...over,
  });
  return render(<ConnectSessionAlert />);
};

describe('ConnectSessionAlert', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when there is no alert to show', () => {
    const { container } = setup({ showAlert: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the "Claude isn\'t installed" state with a download link', () => {
    setup({ errorKind: 'not-installed' });
    expect(
      screen.getByText(/Claude isn't installed on this machine/i),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /download claude/i });
    expect(link).toHaveAttribute('href', CLAUDE_DOWNLOAD_URL);
  });

  it('renders the "couldn\'t launch" state and retries on click', () => {
    const retry = jest.fn();
    setup({ errorKind: 'launch-failed', retry });
    expect(
      screen.getByText(/couldn't launch Claude Code session/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('calls dismiss when the alert is closed', () => {
    const dismiss = jest.fn();
    const { container } = setup({ errorKind: 'launch-failed', dismiss });
    const closeIcon = container.querySelector('.ant-alert-close-icon');
    expect(closeIcon).not.toBeNull();
    fireEvent.click(closeIcon as Element);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
