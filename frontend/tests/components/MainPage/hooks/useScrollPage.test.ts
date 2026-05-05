import { renderHook } from '@testing-library/react';

import { useScrollPage } from '../../../../components/MainPage/hooks/useScrollPage';
import { PAGES } from '../../../../constants';
import { useServices } from '../../../../hooks';
import { usePageState } from '../../../../hooks/usePageState';

jest.mock('../../../../hooks/usePageState', () => ({
  usePageState: jest.fn(),
}));
jest.mock('../../../../hooks', () => ({
  useServices: jest.fn(),
}));

const mockUsePageState = usePageState as jest.MockedFunction<
  typeof usePageState
>;
const mockUseServices = useServices as jest.MockedFunction<typeof useServices>;

const mockScrollTo = jest.fn();

const createMockDiv = () =>
  ({ scrollTo: mockScrollTo }) as unknown as HTMLDivElement;

describe('useScrollPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePageState.mockReturnValue({
      pageState: PAGES.Main,
    } as ReturnType<typeof usePageState>);
    mockUseServices.mockReturnValue({
      selectedServiceConfigId: 'sc-test-1234',
    } as unknown as ReturnType<typeof useServices>);
  });

  it('returns a ref object', () => {
    const { result } = renderHook(() => useScrollPage());
    expect(result.current).toHaveProperty('current');
    expect(result.current.current).toBeNull();
  });

  it('calls scrollTo when pageState changes', () => {
    const { result, rerender } = renderHook(() => useScrollPage());

    // Attach a mock DOM element to the ref
    Object.defineProperty(result.current, 'current', {
      value: createMockDiv(),
      writable: true,
    });

    // Change pageState to trigger the effect
    mockUsePageState.mockReturnValue({
      pageState: PAGES.Settings,
    } as ReturnType<typeof usePageState>);
    rerender();

    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('calls scrollTo when selectedServiceConfigId changes', () => {
    const { result, rerender } = renderHook(() => useScrollPage());

    Object.defineProperty(result.current, 'current', {
      value: createMockDiv(),
      writable: true,
    });

    mockUseServices.mockReturnValue({
      selectedServiceConfigId: 'sc-other-5678',
    } as unknown as ReturnType<typeof useServices>);
    rerender();

    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('does not throw when ref.current is null', () => {
    const { rerender } = renderHook(() => useScrollPage());

    mockUsePageState.mockReturnValue({
      pageState: PAGES.Settings,
    } as ReturnType<typeof usePageState>);

    expect(() => rerender()).not.toThrow();
  });
});
