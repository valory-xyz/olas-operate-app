import { Button, Flex, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { CLAUDE_DOWNLOAD_URL } from '@/constants';
import { useConnectSession } from '@/hooks';

const { Text } = Typography;

// Built the same way as AgentRunningAlert — centered info alert, default icon,
// copy at text-sm.
const SessionInfoAlert = ({ message }: { message: string }) => (
  <Alert
    showIcon
    centered
    className="mt-16"
    type="info"
    message={<Text className="text-sm">{message}</Text>}
  />
);

/**
 * Surfaces the state of the Connect agent's local Claude Code session (see
 * `useConnectSession`). While the agent is idle, an info alert nudges the user
 * to start it; while it runs, the AgentActivity strip below the card carries
 * the "start a new session" notice instead. On a failed launch it shows one
 * of two error states:
 * - `harness_not_installed`: Claude isn't installed → prompt to download it.
 * - `launch_failed`: transient launch failure → a Retry button.
 */
export const ConnectSessionAlert = () => {
  const {
    showAlert,
    showStartInfo,
    errorKind,
    errorMessage,
    isLaunching,
    retry,
    dismiss,
  } = useConnectSession();

  if (showStartInfo) {
    return (
      <SessionInfoAlert message="Start agent to initiate a Claude Code session with Connect capabilities." />
    );
  }

  // While the agent runs, the AgentActivity strip carries the "start a new
  // session from the agent profile" notice — never duplicated here.
  if (!showAlert) return null;

  if (errorKind === 'not-installed') {
    return (
      <Alert
        showIcon
        closable
        onClose={dismiss}
        className="mt-16"
        type="error"
        message={
          <>
            <Text className="text-sm">
              <span className="font-weight-600">
                Claude isn&apos;t installed on this machine.
              </span>
              <br />
              {/* Prefer the server's message — it explains which case this is
                  (no Claude vs. the wrong harness selected). */}
              {errorMessage ??
                'Connect works with the Claude Desktop app or the Claude Code CLI. Install one, then start the agent again.'}
            </Text>
            <br />
            <Button
              size="small"
              className="mt-8"
              href={CLAUDE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Claude
            </Button>
          </>
        }
      />
    );
  }

  return (
    <Alert
      showIcon
      closable
      onClose={dismiss}
      className="mt-16"
      type="error"
      message={
        <Flex justify="space-between" gap={4}>
          <Text className="text-sm">
            {errorMessage ?? "Pearl couldn't launch Claude Code session."}
          </Text>
          <Button
            size="small"
            className="mr-6"
            onClick={retry}
            loading={isLaunching}
          >
            Retry
          </Button>
        </Flex>
      }
    />
  );
};
