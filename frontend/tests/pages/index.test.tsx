import { render, screen } from '@testing-library/react';

import { PAGES } from '../../constants';
import { useElectronApi, usePageState } from '../../hooks';

jest.mock('../../hooks', () => ({
  usePageState: jest.fn(),
  useElectronApi: jest.fn(),
}));

jest.mock('../../components/MainPage', () => ({
  Main: () => <div data-testid="main-page">Main</div>,
}));

jest.mock('../../components/SetupPage', () => ({
  Setup: () => <div data-testid="setup-page">Setup</div>,
}));

const mockUsePageState = usePageState as jest.MockedFunction<
  typeof usePageState
>;
const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;

// Must import after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: Home } = require('../../pages/index');

describe('Home page', () => {
  const mockSetIsAppLoaded = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseElectronApi.mockReturnValue({
      setIsAppLoaded: mockSetIsAppLoaded,
    });
  });

  it('renders Setup component when pageState is PAGES.Setup', () => {
    mockUsePageState.mockReturnValue({
      pageState: PAGES.Setup,
    } as ReturnType<typeof usePageState>);

    render(<Home />);
    expect(screen.getByTestId('setup-page')).toBeInTheDocument();
  });

  it('renders Main component when pageState is PAGES.Main', () => {
    mockUsePageState.mockReturnValue({
      pageState: PAGES.Main,
    } as ReturnType<typeof usePageState>);

    render(<Home />);
    expect(screen.getByTestId('main-page')).toBeInTheDocument();
  });

  it('renders Main component for default/unknown pageState', () => {
    mockUsePageState.mockReturnValue({
      pageState: 'UnknownPage',
    } as unknown as ReturnType<typeof usePageState>);

    render(<Home />);
    expect(screen.getByTestId('main-page')).toBeInTheDocument();
  });

  it('calls setIsAppLoaded(true) on mount', () => {
    mockUsePageState.mockReturnValue({
      pageState: PAGES.Main,
    } as ReturnType<typeof usePageState>);

    render(<Home />);
    expect(mockSetIsAppLoaded).toHaveBeenCalledWith(true);
    expect(mockSetIsAppLoaded).toHaveBeenCalledTimes(1);
  });

  it('does not crash when electronApi is undefined', () => {
    mockUseElectronApi.mockReturnValue({});
    mockUsePageState.mockReturnValue({
      pageState: PAGES.Main,
    } as ReturnType<typeof usePageState>);

    expect(() => render(<Home />)).not.toThrow();
    expect(screen.getByTestId('main-page')).toBeInTheDocument();
  });

  it('does not crash when setIsAppLoaded is undefined', () => {
    mockUseElectronApi.mockReturnValue({
      setIsAppLoaded: undefined,
    });
    mockUsePageState.mockReturnValue({
      pageState: PAGES.Main,
    } as ReturnType<typeof usePageState>);

    expect(() => render(<Home />)).not.toThrow();
    expect(screen.getByTestId('main-page')).toBeInTheDocument();
  });
});
