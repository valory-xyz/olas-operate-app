import { Button, Flex, Typography } from 'antd';
import React from 'react';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';

import { ExportLogsButton } from '../ExportLogsButton';

const { Text } = Typography;

type FundsAreSafeMessageProps = {
  onRetry?: () => void;
  onRetryProps?: { isLoading: boolean };
  showRestartMessage?: boolean;
};

export const FundsAreSafeMessage = ({
  onRetry,
  onRetryProps,
  showRestartMessage,
}: FundsAreSafeMessageProps) => (
  <Flex vertical gap={8} align="flex-start" className="mt-12 text-sm">
    <Flex gap={8}>
      {onRetry && (
        <Button
          loading={onRetryProps?.isLoading}
          onClick={onRetry}
          type="primary"
          size="small"
        >
          Retry
        </Button>
      )}
      <ExportLogsButton size="small" />
    </Flex>

    <Text className="text-sm text-lighter">
      Don&apos;t worry, your funds remain safe. You can access them by importing
      your Pearl seed phrase into a compatible wallet, like MetaMask or
      Coinbase.
    </Text>

    <Text className="text-sm text-lighter">
      Ask for help in{' '}
      <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
        the Olas community Discord server {UNICODE_SYMBOLS.EXTERNAL_LINK}
      </a>
    </Text>

    {showRestartMessage && (
      <Text className="text-sm text-lighter">
        You can also try restarting the app!
      </Text>
    )}
  </Flex>
);
