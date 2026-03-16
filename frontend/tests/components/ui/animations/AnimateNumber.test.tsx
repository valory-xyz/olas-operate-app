import { render, screen } from '@testing-library/react';
import { act } from 'react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { AnimateNumber } from '../../../../components/ui/animations/AnimateNumber';

// ---------------------------------------------------------------------------
// framer-motion mock
// ---------------------------------------------------------------------------
let springChangeCallback: ((latest: number) => void) | null = null;

const mockSpringSet = jest.fn();
const mockSpringOn = jest.fn(
  (_event: string, callback: (latest: number) => void) => {
    springChangeCallback = callback;
    return jest.fn(); // unsubscribe
  },
);

jest.mock('framer-motion', () => ({
  motion: {
    span: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <span {...rest}>{children}</span>,
  },
  useSpring: () => ({
    set: mockSpringSet,
    on: mockSpringOn,
    get: jest.fn(() => 0),
  }),
}));

describe('AnimateNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    springChangeCallback = null;
  });

  it('renders formatted value when value is provided', () => {
    render(<AnimateNumber value={100} />);
    // balanceFormat will format the initial value (0 for spring start, but displayValue starts at value)
    // Actually displayValue starts at `isNil(value) ? 0 : value` = 100
    // But with triggerAnimation=true, springValue.set(100) is called and display is initially 100
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('renders 0 when value is null', () => {
    render(<AnimateNumber value={null} />);
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it('renders 0 when value is undefined', () => {
    render(<AnimateNumber value={undefined} />);
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it('calls springValue.set when triggerAnimation is true (default)', () => {
    render(<AnimateNumber value={42} />);
    expect(mockSpringSet).toHaveBeenCalledWith(42);
  });

  it('does not call springValue.set when triggerAnimation is false', () => {
    render(<AnimateNumber value={42} triggerAnimation={false} />);
    expect(mockSpringSet).not.toHaveBeenCalled();
  });

  it('uses custom formatter when provided', () => {
    const customFormatter = (v: number) => `$${v.toFixed(2)}`;
    render(<AnimateNumber value={10} formatter={customFormatter} />);
    expect(screen.getByText('$10.00')).toBeInTheDocument();
  });

  it('does not subscribe to spring changes when triggerAnimation is false', () => {
    render(<AnimateNumber value={42} triggerAnimation={false} />);
    // mockSpringOn should not be called for animation subscription
    // (the second useEffect guards on !triggerAnimation and returns early)
    // but the first useEffect may not call springOn either
    expect(mockSpringOn).not.toHaveBeenCalled();
  });

  it('subscribes to spring changes when triggerAnimation is true', () => {
    render(<AnimateNumber value={42} />);
    expect(mockSpringOn).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('calls onAnimationChange during animation', () => {
    const onAnimationChange = jest.fn();
    render(<AnimateNumber value={100} onAnimationChange={onAnimationChange} />);
    expect(mockSpringOn).toHaveBeenCalled();
    // Simulate spring change with a value far from target
    expect(springChangeCallback).not.toBeNull();
    act(() => {
      springChangeCallback!(50);
    });
    expect(onAnimationChange).toHaveBeenCalledWith(true);
  });

  it('calls onAnimationChange(false) when animation is near completion', () => {
    const onAnimationChange = jest.fn();
    render(<AnimateNumber value={100} onAnimationChange={onAnimationChange} />);
    expect(springChangeCallback).not.toBeNull();
    act(() => {
      springChangeCallback!(100.005);
    });
    expect(onAnimationChange).toHaveBeenCalledWith(false);
  });

  it('updates display value periodically during animation', () => {
    jest.useFakeTimers();
    const now = Date.now();
    jest.setSystemTime(now);
    render(<AnimateNumber value={100} />);
    expect(springChangeCallback).not.toBeNull();
    // First call: lastUpdate = now, so now - lastUpdate = 0 (< 100), no update
    act(() => {
      springChangeCallback!(50);
    });
    // Advance time by 150ms to trigger the periodic update
    jest.setSystemTime(now + 150);
    act(() => {
      springChangeCallback!(75);
    });
    // Display value should have been updated
    expect(screen.getByText(/75/)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('does not call springValue.set when value becomes nil', () => {
    const { rerender } = render(<AnimateNumber value={42} />);
    mockSpringSet.mockClear();
    rerender(<AnimateNumber value={null} />);
    expect(mockSpringSet).not.toHaveBeenCalled();
  });

  it('sets display value directly when triggerAnimation is false', () => {
    render(<AnimateNumber value={55.5} triggerAnimation={false} />);
    expect(screen.getByText(/55\.5/)).toBeInTheDocument();
  });
});
