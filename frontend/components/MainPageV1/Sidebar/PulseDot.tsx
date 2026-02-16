import React from 'react';
import styled, { keyframes } from 'styled-components';

const DOT = '#7e22ce';
const RING = 'rgba(126,34,206,0.85)';

const DOT_SIZE = 8; // px
const RING_THICKNESS = 1; // px
const CYCLE = 1250; // ms (duration + rest)
const EASING = 'cubic-bezier(.1,0,.2,1)';

const START_OPACITY = 0.75;
const MID_OPACITY = 0;
const END_OPACITY = 0;

const END_SCALE = 2.5;

const RING_COUNT = 2;
const STAGGER = 0; // ms
const RING_GLOW = 0; // px
const RING_INSET_GLOW = 6; // px
const SOFTEN = 0; // px

const pulse = keyframes`
  0%{
    transform: scale(1);
    opacity: ${START_OPACITY};
  }
  70%{
    opacity: ${MID_OPACITY};
  }
  100%{
    transform: scale(${END_SCALE});
    opacity: ${END_OPACITY};
  }
`;

const Wrap = styled.span`
  position: relative;
  width: ${DOT_SIZE * 10}px;
  height: ${DOT_SIZE * 10}px;
  display: grid;
  place-items: center;
  z-index: 1;
  filter: blur(${SOFTEN}px);
`;

const Dot = styled.span`
  border-radius: 999px;
  background: ${DOT};
  box-shadow: 0 0 16px rgba(0, 0, 0, 0.1);
  z-index: 3;
`;

const Ring = styled.span<{ $delayMs: number }>`
  position: absolute;
  width: ${DOT_SIZE + RING_THICKNESS * 2}px;
  height: ${DOT_SIZE + RING_THICKNESS * 2}px;
  border-radius: 999px;
  border: ${RING_THICKNESS}px solid ${RING};

  /* Critical: keep invisible while waiting (delay/rest) */
  opacity: 0;
  transform: scale(1);

  box-shadow:
    0 0 ${RING_GLOW}px color-mix(in oklab, ${RING} 70%, transparent),
    inset 0 0 ${RING_INSET_GLOW}px rgba(0, 0, 0, 0.06);

  z-index: 2;
  will-change: transform, opacity;

  animation: ${pulse} ${CYCLE}ms ${EASING} infinite;
  animation-delay: ${(p) => p.$delayMs}ms;
`;

export function PulseDot() {
  return (
    <Wrap aria-hidden>
      <Dot />
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <Ring key={i} $delayMs={i * STAGGER} />
      ))}
    </Wrap>
  );
}
