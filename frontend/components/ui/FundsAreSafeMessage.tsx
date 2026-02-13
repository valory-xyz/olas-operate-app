import { Button, Flex, Typography } from 'antd';
import React from 'react';

import { useSupportModal } from '@/context/SupportModalProvider';

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
}: FundsAreSafeMessageProps) => {
  const { toggleSupportModal } = useSupportModal();

  return (
    <Flex vertical gap={8} align="flex-start" className="mt-12 text-sm">
      <Flex gap={8}>
        {onRetry && (
          <Button
            loading={onRetryProps?.isLoading}
            onClick={onRetry}
            type="primary"
          >
            Retry
          </Button>
        )}
        <Button
          loading={onRetryProps?.isLoading}
          type="default"
          onClick={toggleSupportModal}
        >
          Contact Support
        </Button>
      </Flex>

      <Text className="text-sm text-lighter">
        Don&apos;t worry, your funds remain safe. Try again or contact support.
      </Text>

      {showRestartMessage && (
        <Text className="text-sm text-lighter">
          You can also try restarting the app!
        </Text>
      )}
    </Flex>
  );
};
