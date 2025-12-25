import React, { Component, ReactNode } from 'react';

type ErrorBoundaryProps = {
  logger?: (error: Error, errorInfo: unknown) => void;
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
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
    if (this.state.hasError) {
      return <div>An error occurred.</div>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
