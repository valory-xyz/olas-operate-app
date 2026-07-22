import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';

import { Alert } from '@/components/ui';
import { CLAUDE_DOWNLOAD_URL } from '@/constants';
import { useConnectSession } from '@/hooks';

const { Text } = Typography;

// Sized to match the other agent alerts ("Complete Agent Setup",
// "phased out"), whose copy renders at text-sm.
const SessionInfoAlert = ({ message }: { message: string }) => (
  <Alert
    type="info"
    showIcon
    fullWidth
    customIcon={<InfoCircleOutlined className="text-sm" />}
    className="mt-16"
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
        type="error"
        showIcon
        fullWidth
        closable
        onClose={dismiss}
        className="mt-16"
        message={
          <Text className="font-weight-600">
            Claude isn&apos;t installed on this machine.
          </Text>
        }
        description={
          <Flex vertical gap={12} align="flex-start">
            {/* Prefer the server's message — it explains which case this is
                (no Claude vs. the wrong harness selected). */}
            <Text>
              {errorMessage ??
                'Connect works with the Claude Desktop app or the Claude Code CLI. Install one, then start the agent again.'}
            </Text>
            <Button
              href={CLAUDE_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Claude
            </Button>
          </Flex>
        }
      />
    );
  }

  return (
    <Alert
      type="error"
      showIcon
      fullWidth
      closable
      onClose={dismiss}
      className="mt-16"
      message={errorMessage ?? "Pearl couldn't launch Claude Code session."}
      action={
        <Button size="small" onClick={retry} loading={isLaunching}>
          Retry
        </Button>
      }
    />
  );
};
