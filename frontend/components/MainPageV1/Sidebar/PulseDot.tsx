import React from 'react';
import styled, { keyframes } from 'styled-components';

import { COLOR } from '@/constants';

const DOT_SIZE = 8;
const RING_THICKNESS = 1;
const RING_COUNT = 2;

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.75;
  }
  70% {
    opacity: 0;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
`;

const Container = styled.span`
  position: relative;
  display: grid;
  place-items: center;
  left: -20px;
`;

const Dot = styled.span`
  width: ${DOT_SIZE}px;
  height: ${DOT_SIZE}px;
  z-index: 3;
  border-radius: 50%;
  background: ${COLOR.PRIMARY};
  box-shadow: 0 0 16px rgba(0, 0, 0, 0.1);
`;

const Ring = styled.span`
  position: absolute;
  width: ${DOT_SIZE + RING_THICKNESS * 2}px;
  height: ${DOT_SIZE + RING_THICKNESS * 2}px;
  z-index: 2;
  border-radius: 50%;
  border: ${RING_THICKNESS}px solid ${COLOR.PRIMARY};
  opacity: 0;
  transform: scale(1);
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.06);
  will-change: transform, opacity;
  animation: ${pulse} 1250ms cubic-bezier(0.1, 0, 0.2, 1) infinite;
`;

const VisuallyHidden = styled.span`
  border: 0;
  clip: rect(0 0 0 0);
  height: 1px;
  width: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
`;

export const PulseDot = () => {
  return (
    <Container role="status" aria-live="polite">
      <VisuallyHidden>Agent is currently running</VisuallyHidden>
      <Dot aria-hidden="true" />
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <Ring key={i} aria-hidden="true" />
      ))}
    </Container>
  );
};
