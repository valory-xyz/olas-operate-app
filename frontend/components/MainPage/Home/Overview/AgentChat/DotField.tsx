import { CSSProperties } from 'react';
import styled, { keyframes } from 'styled-components';

import { COLOR } from '@/constants';

const COLUMNS = 23;
const ROWS = 9;
const PITCH = 13;
const DOT_SIZE = 3;
const REST_OPACITY = 0.04;
const PEAK_OPACITY = 0.54;
const RIPPLE_DURATION_S = 2.4;
const RING_DELAY_S = 0.12;

const CENTER_X = ((COLUMNS - 1) * PITCH) / 2;
const CENTER_Y = ((ROWS - 1) * PITCH) / 2;
const MAX_RING = Math.hypot(CENTER_X, CENTER_Y) / PITCH;

const DOTS = Array.from({ length: COLUMNS * ROWS }, (_, index) => {
  const x = (index % COLUMNS) * PITCH;
  const y = Math.floor(index / COLUMNS) * PITCH;
  const ring = Math.hypot(x - CENTER_X, y - CENTER_Y) / PITCH;
  const peak =
    REST_OPACITY + (PEAK_OPACITY - REST_OPACITY) * (1 - ring / MAX_RING);
  return { x, y, peak, delay: ring * RING_DELAY_S };
});

const ripple = keyframes`
  0%, 60%, 100% {
    opacity: ${REST_OPACITY};
  }
  20% {
    opacity: var(--peak);
  }
`;

const Field = styled.div`
  position: relative;
  flex: none;
  width: ${(COLUMNS - 1) * PITCH + DOT_SIZE}px;
  height: ${(ROWS - 1) * PITCH + DOT_SIZE}px;
`;

const Dot = styled.span`
  position: absolute;
  width: ${DOT_SIZE}px;
  height: ${DOT_SIZE}px;
  border-radius: 50%;
  background: ${COLOR.PURPLE};
  opacity: ${REST_OPACITY};
  animation: ${ripple} ${RIPPLE_DURATION_S}s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: var(--peak);
  }
`;

/** Dots rippling out from the centre, above the empty chat's title. */
export const DotField = () => (
  <Field aria-hidden data-testid="dot-field">
    {DOTS.map(({ x, y, peak, delay }) => (
      <Dot
        key={`${x}-${y}`}
        style={
          {
            left: x,
            top: y,
            animationDelay: `${delay}s`,
            '--peak': peak,
          } as CSSProperties
        }
      />
    ))}
  </Field>
);
