import { Button, Flex, Image, Typography } from 'antd';
import React, { Component, ReactNode, useState } from 'react';
import { styled } from 'styled-components';

import { SupportModal } from '@/components/SupportModal/SupportModal';

const { Text, Title } = Typography;

const ErrorContainer = styled(Flex)`
  min-height: 100vh;
  background-color: white;
`;

type ErrorBoundaryProps = {
  logger?: (error: Error, errorInfo: unknown) => void;
  fallbackComponent?: ReactNode;
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

const MainPageFallback = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ErrorContainer vertical align="center" justify="center">
      <Flex
        vertical
        align="center"
        gap={12}
        style={{ maxWidth: 500, textAlign: 'center' }}
      >
        <div className="mb-24">
          <Image
            src="/pearl-with-gradient.png"
            alt="Pearl Logo"
            width={80}
            height={80}
          />
        </div>
        <Title level={3} className="m-0">
          An unexpected error occurred
        </Title>
        <Text type="secondary" className="text-sm">
          We encountered an unexpected error. Please try restarting the
          application. If the problem persists, please contact support.
        </Text>

        <Button
          type="primary"
          size="large"
          onClick={() => setIsModalOpen(true)}
          className="mt-12"
        >
          Contact Support
        </Button>
      </Flex>

      <SupportModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shouldUseFallbackLogs
      />
    </ErrorContainer>
  );
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { logger } = this.props;
    logger?.(error, errorInfo);
  }

  render() {
    const { children, fallbackComponent } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      return fallbackComponent || <MainPageFallback />;
    }
    return children;
  }
}

export default ErrorBoundary;
