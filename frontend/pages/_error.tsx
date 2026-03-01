import { Button, Flex, Image, Typography } from 'antd';
import { NextPageContext } from 'next';
import { useState } from 'react';
import { styled } from 'styled-components';

import { SupportModal } from '@/components/SupportModal/SupportModal';

const { Text, Title } = Typography;

const ErrorContainer = styled(Flex)`
  min-height: 100vh;
  background-color: white;
`;

interface ErrorProps {
  statusCode: number;
  errorMessage?: string;
}

const ErrorPage = ({ statusCode, errorMessage }: ErrorProps) => {
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
            preview={false}
          />
        </div>
        <Title level={3} className="m-0">
          {statusCode === 404
            ? 'Page not found'
            : 'An unexpected error occurred'}
        </Title>
        <Text type="secondary" className="text-sm">
          {statusCode === 404 ? (
            'The page you are looking for does not exist.'
          ) : (
            <>
              We encountered an unexpected error ({statusCode}).
              {errorMessage && (
                <>
                  <br />
                  <code style={{ fontSize: '12px' }}>{errorMessage}</code>
                </>
              )}
              <br />
              Please try restarting the application. If the problem persists,
              please contact support.
            </>
          )}
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

ErrorPage.getInitialProps = async ({
  res,
  err,
}: NextPageContext): Promise<ErrorProps> => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  const errorMessage = err?.message;

  // Server-side logging (runs during SSR errors)
  if (typeof window === 'undefined' && err) {
    console.error(`[SSR Error] ${statusCode}: ${err.message}`);
    console.error(`Stack: ${err.stack}`);
  }

  // Client-side logging via Electron API
  if (typeof window !== 'undefined' && err) {
    try {
      const electronAPI = (window as Window & { electronAPI?: { nextLogError?: (error: Error, errorInfo: unknown) => void } }).electronAPI;
      electronAPI?.nextLogError?.(err, {
        type: 'page-error',
        statusCode,
        url: window.location.href,
      });
    } catch (e) {
      // Silently fail if electron API is not available
    }
  }

  return { statusCode, errorMessage };
};

export default ErrorPage;
