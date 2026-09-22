import { fireEvent, render, screen } from '@testing-library/react';

import { ConnectSessionAlert } from '../../../../../../components/MainPage/Home/Overview/AgentInfo/ConnectSessionAlert';
import { CLAUDE_CODE_CLI_INSTALL_URL } from '../../../../../../constants';
import { useConnectSession } from '../../../../../../hooks';

jest.mock('../../../../../../hooks', () => ({
  useConnectSession: jest.fn(),
}));

const mockUseConnectSession = useConnectSession as jest.Mock;

const setup = (over: Record<string, unknown> = {}) => {
  mockUseConnectSession.mockReturnValue({
    showAlert: true,
    showStartInfo: false,
    showRunningInfo: false,
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

  it('renders the start-agent info alert when the agent is idle', () => {
    setup({ showAlert: false, showStartInfo: true });
    expect(
      screen.getByText(
        /Start agent to initiate a Claude Code session with Connect capabilities/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders nothing while the agent runs without an error (strip owns the notice)', () => {
    const { container } = setup({
      showAlert: false,
      showRunningInfo: true,
      errorKind: null,
    });
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByText(/Start a new session from the agent profile/i),
    ).not.toBeInTheDocument();
  });

  it('renders nothing while running with a dismissed launch error (strip owns the notice)', () => {
    const { container } = setup({
      showAlert: false,
      showRunningInfo: true,
      errorKind: 'launch-failed',
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('prefers the start-agent info alert over error states while idle', () => {
    setup({ showStartInfo: true, errorKind: 'launch-failed' });
    expect(
      screen.getByText(
        /Start agent to initiate a Claude Code session with Connect capabilities/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/couldn't launch Claude Code session/i),
    ).not.toBeInTheDocument();
  });

  it('renders the "Claude isn\'t installed" state with a download link', () => {
    setup({ errorKind: 'not-installed' });
    expect(
      screen.getByText(/Claude isn't installed on this machine/i),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /download claude/i });
    // Wiring only: this compares the href against the constant that rendered
    // it, so it catches a dropped href but never a wrong destination. The
    // value itself is pinned in tests/constants/urls.test.ts.
    expect(link).toHaveAttribute('href', CLAUDE_CODE_CLI_INSTALL_URL);
  });

  it('falls back to the CLI-first description when the server sent no message', () => {
    setup({ errorKind: 'not-installed' });
    expect(
      screen.getByText(/Connect works with the Claude Code CLI or Codex/i),
    ).toBeInTheDocument();
  });

  it("shows the server's message instead of the fallback description", () => {
    setup({
      errorKind: 'not-installed',
      errorMessage: 'Could not open claude_code_cli - is it installed?',
    });
    expect(
      screen.getByText(/Could not open claude_code_cli - is it installed\?/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Connect works with the Claude Code CLI or Codex/i),
    ).not.toBeInTheDocument();
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
