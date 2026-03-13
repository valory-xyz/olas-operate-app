import { render, screen } from '@testing-library/react';

jest.mock('../../components/Web3AuthIframe/Web3AuthIframe', () => ({
  Web3AuthIframe: () => <div data-testid="web3auth-iframe">Web3AuthIframe</div>,
}));

// Must import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: Web3Auth } = require('../../pages/web3auth');

describe('Web3Auth page', () => {
  it('renders Web3AuthIframe component', () => {
    render(<Web3Auth />);
    expect(screen.getByTestId('web3auth-iframe')).toBeInTheDocument();
  });

  it('renders Web3AuthIframe with correct text content', () => {
    render(<Web3Auth />);
    expect(screen.getByTestId('web3auth-iframe')).toHaveTextContent(
      'Web3AuthIframe',
    );
  });
});
