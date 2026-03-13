import { render, screen } from '@testing-library/react';
import { act } from 'react';

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import {
  PAGE_TRANSITION_DELAY_MS,
  PAGE_TRANSITION_DURATION,
  PageTransition,
  usePageTransitionValue,
} from '../../../../components/ui/animations/PageTransition';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
  motion: {
    div: ({
      children,
      className,
      style,
      ...rest
    }: {
      children: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
      [key: string]: unknown;
    }) => (
      <div
        data-testid="motion-div"
        className={className}
        style={style}
        data-initial={JSON.stringify(rest.initial)}
        data-animate={JSON.stringify(rest.animate)}
        data-exit={JSON.stringify(rest.exit)}
        data-transition={JSON.stringify(rest.transition)}
      >
        {children}
      </div>
    ),
  },
}));

// Helper component to test the hook
const HookTestComponent = ({
  value,
  delayMs,
}: {
  value: string;
  delayMs?: number;
}) => {
  const delayed = usePageTransitionValue(value, delayMs);
  return <span data-testid="delayed-value">{delayed}</span>;
};

describe('PageTransition', () => {
  it('exports correct constants', () => {
    expect(PAGE_TRANSITION_DURATION).toBe(0.1);
    expect(PAGE_TRANSITION_DELAY_MS).toBe(80);
  });

  it('renders children', () => {
    render(
      <PageTransition animationKey="page1">
        <span>Page content</span>
      </PageTransition>,
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('wraps children in AnimatePresence', () => {
    render(
      <PageTransition animationKey="page1">
        <span>Content</span>
      </PageTransition>,
    );
    expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
  });

  it('applies default animation values', () => {
    render(
      <PageTransition animationKey="page1">
        <span>Content</span>
      </PageTransition>,
    );
    const motionDiv = screen.getByTestId('motion-div');
    expect(JSON.parse(motionDiv.getAttribute('data-initial')!)).toEqual({
      opacity: 0,
      y: 8,
    });
    expect(JSON.parse(motionDiv.getAttribute('data-animate')!)).toEqual({
      opacity: 1,
      y: 0,
    });
    expect(JSON.parse(motionDiv.getAttribute('data-exit')!)).toEqual({
      opacity: 0,
      y: -8,
    });
    expect(JSON.parse(motionDiv.getAttribute('data-transition')!)).toEqual({
      duration: PAGE_TRANSITION_DURATION,
      ease: 'easeOut',
    });
  });

  it('applies custom initialY and exitY', () => {
    render(
      <PageTransition animationKey="page1" initialY={20} exitY={-20}>
        <span>Content</span>
      </PageTransition>,
    );
    const motionDiv = screen.getByTestId('motion-div');
    expect(JSON.parse(motionDiv.getAttribute('data-initial')!)).toEqual({
      opacity: 0,
      y: 20,
    });
    expect(JSON.parse(motionDiv.getAttribute('data-exit')!)).toEqual({
      opacity: 0,
      y: -20,
    });
  });

  it('applies custom duration and ease', () => {
    render(
      <PageTransition animationKey="page1" duration={0.5} ease="linear">
        <span>Content</span>
      </PageTransition>,
    );
    const motionDiv = screen.getByTestId('motion-div');
    expect(JSON.parse(motionDiv.getAttribute('data-transition')!)).toEqual({
      duration: 0.5,
      ease: 'linear',
    });
  });

  it('applies className and style props', () => {
    render(
      <PageTransition
        animationKey="page1"
        className="custom-class"
        style={{ padding: 10 }}
      >
        <span>Content</span>
      </PageTransition>,
    );
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveClass('custom-class');
    expect(motionDiv).toHaveStyle({ padding: '10px' });
  });

  it('accepts numeric animationKey', () => {
    render(
      <PageTransition animationKey={42}>
        <span>Content</span>
      </PageTransition>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('accepts ease as number array', () => {
    render(
      <PageTransition animationKey="page1" ease={[0.4, 0, 0.2, 1]}>
        <span>Content</span>
      </PageTransition>,
    );
    const motionDiv = screen.getByTestId('motion-div');
    expect(JSON.parse(motionDiv.getAttribute('data-transition')!)).toEqual({
      duration: PAGE_TRANSITION_DURATION,
      ease: [0.4, 0, 0.2, 1],
    });
  });
});

describe('usePageTransitionValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    render(<HookTestComponent value="initial" />);
    expect(screen.getByTestId('delayed-value')).toHaveTextContent('initial');
  });

  it('delays value updates by default (80ms)', () => {
    const { rerender } = render(<HookTestComponent value="first" />);
    rerender(<HookTestComponent value="second" />);
    // Value should still be "first" before timeout
    expect(screen.getByTestId('delayed-value')).toHaveTextContent('first');
    act(() => {
      jest.advanceTimersByTime(PAGE_TRANSITION_DELAY_MS);
    });
    expect(screen.getByTestId('delayed-value')).toHaveTextContent('second');
  });

  it('uses custom delay when provided', () => {
    const { rerender } = render(
      <HookTestComponent value="first" delayMs={200} />,
    );
    rerender(<HookTestComponent value="second" delayMs={200} />);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('delayed-value')).toHaveTextContent('first');
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('delayed-value')).toHaveTextContent('second');
  });

  it('clears previous timeout on rapid updates', () => {
    const { rerender } = render(<HookTestComponent value="first" />);
    rerender(<HookTestComponent value="second" />);
    act(() => {
      jest.advanceTimersByTime(40);
    });
    rerender(<HookTestComponent value="third" />);
    act(() => {
      jest.advanceTimersByTime(PAGE_TRANSITION_DELAY_MS);
    });
    expect(screen.getByTestId('delayed-value')).toHaveTextContent('third');
  });
});
