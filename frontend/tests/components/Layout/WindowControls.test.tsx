import { fireEvent, render } from '@testing-library/react';
import { useRouter } from 'next/router';
import { createElement } from 'react';

import { useElectronApi } from '../../../hooks/useElectronApi';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../../constants/providers', () => ({}));
jest.mock('../../../config/providers', () => ({ providers: [] }));

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../../hooks/useElectronApi', () => ({
  useElectronApi: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Typed mock accessors
// ---------------------------------------------------------------------------

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseElectronApi = useElectronApi as jest.MockedFunction<
  typeof useElectronApi
>;

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WindowControls } = require('../../../components/Layout/WindowControls');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeElectronApiMocks = () => ({
  closeApp: jest.fn(),
  minimizeApp: jest.fn(),
  onRampWindow: { close: jest.fn() },
  web3AuthWindow: { close: jest.fn() },
  web3AuthSwapOwnerWindow: { close: jest.fn() },
});

const setupMocks = (pathname: string) => {
  const mocks = makeElectronApiMocks();

  mockUseRouter.mockReturnValue({
    pathname,
  } as unknown as ReturnType<typeof useRouter>);

  mockUseElectronApi.mockReturnValue(
    mocks as unknown as ReturnType<typeof useElectronApi>,
  );

  return mocks;
};

/**
 * The component renders a container div with three styled child divs
 * (traffic light dots): RedLight (close), YellowLight/DisabledLight (minimize),
 * DisabledLight (maximize placeholder, always disabled).
 *
 * The render tree inside `container` is: <div (rtl wrapper)> → <WindowControlsContainer> → 3 × child divs
 */
const getTrafficLights = (container: HTMLElement) => {
  // container.firstElementChild is the WindowControlsContainer
  const wrapper = container.firstElementChild as HTMLElement;
  const dots = wrapper.children;
  return {
    close: dots[0] as HTMLElement,
    minimize: dots[1] as HTMLElement,
    maximize: dots[2] as HTMLElement,
  };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WindowControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('close behavior by route', () => {
    it('calls closeApp on main route ("/")', () => {
      const mocks = setupMocks('/');
      const { container } = render(createElement(WindowControls));
      const { close } = getTrafficLights(container);

      fireEvent.click(close);

      expect(mocks.closeApp).toHaveBeenCalledTimes(1);
      expect(mocks.onRampWindow.close).not.toHaveBeenCalled();
      expect(mocks.web3AuthWindow.close).not.toHaveBeenCalled();
      expect(mocks.web3AuthSwapOwnerWindow.close).not.toHaveBeenCalled();
    });

    it('calls onRampWindow.close on /onramp route', () => {
      const mocks = setupMocks('/onramp');
      const { container } = render(createElement(WindowControls));
      const { close } = getTrafficLights(container);

      fireEvent.click(close);

      expect(mocks.onRampWindow.close).toHaveBeenCalledTimes(1);
      expect(mocks.closeApp).not.toHaveBeenCalled();
      expect(mocks.web3AuthWindow.close).not.toHaveBeenCalled();
      expect(mocks.web3AuthSwapOwnerWindow.close).not.toHaveBeenCalled();
    });

    it('calls web3AuthWindow.close on /web3auth route', () => {
      const mocks = setupMocks('/web3auth');
      const { container } = render(createElement(WindowControls));
      const { close } = getTrafficLights(container);

      fireEvent.click(close);

      expect(mocks.web3AuthWindow.close).toHaveBeenCalledTimes(1);
      expect(mocks.closeApp).not.toHaveBeenCalled();
      expect(mocks.onRampWindow.close).not.toHaveBeenCalled();
      expect(mocks.web3AuthSwapOwnerWindow.close).not.toHaveBeenCalled();
    });

    it('calls web3AuthSwapOwnerWindow.close on /web3auth-swap-owner route', () => {
      const mocks = setupMocks('/web3auth-swap-owner');
      const { container } = render(createElement(WindowControls));
      const { close } = getTrafficLights(container);

      fireEvent.click(close);

      expect(mocks.web3AuthSwapOwnerWindow.close).toHaveBeenCalledTimes(1);
      expect(mocks.closeApp).not.toHaveBeenCalled();
      expect(mocks.onRampWindow.close).not.toHaveBeenCalled();
      expect(mocks.web3AuthWindow.close).not.toHaveBeenCalled();
    });

    it('does nothing when closeApp is undefined on main route', () => {
      setupMocks('/');
      mockUseElectronApi.mockReturnValue({
        closeApp: undefined,
        minimizeApp: jest.fn(),
        onRampWindow: { close: jest.fn() },
        web3AuthWindow: { close: jest.fn() },
        web3AuthSwapOwnerWindow: { close: jest.fn() },
      } as unknown as ReturnType<typeof useElectronApi>);

      const { container } = render(createElement(WindowControls));
      const { close } = getTrafficLights(container);

      // Should not throw; none of the sub-window close handlers should fire either
      fireEvent.click(close);

      const electronApi = mockUseElectronApi.mock.results[0].value;
      expect(electronApi.onRampWindow.close).not.toHaveBeenCalled();
      expect(electronApi.web3AuthWindow.close).not.toHaveBeenCalled();
      expect(electronApi.web3AuthSwapOwnerWindow.close).not.toHaveBeenCalled();
    });
  });

  describe('minimize behavior', () => {
    it('calls minimizeApp on main route', () => {
      const mocks = setupMocks('/');
      const { container } = render(createElement(WindowControls));
      const { minimize } = getTrafficLights(container);

      fireEvent.click(minimize);

      expect(mocks.minimizeApp).toHaveBeenCalledTimes(1);
    });

    it.each(['/onramp', '/web3auth', '/web3auth-swap-owner'])(
      'renders disabled minimize button on %s route',
      (pathname) => {
        const mocks = setupMocks(pathname);
        const { container } = render(createElement(WindowControls));
        const { minimize } = getTrafficLights(container);

        fireEvent.click(minimize);

        // minimizeApp should NOT be wired to the disabled light
        expect(mocks.minimizeApp).not.toHaveBeenCalled();
      },
    );
  });

  describe('rendering', () => {
    it('renders three traffic light dots', () => {
      setupMocks('/');
      const { container } = render(createElement(WindowControls));
      const wrapper = container.firstElementChild as HTMLElement;

      expect(wrapper.children).toHaveLength(3);
    });
  });
});
