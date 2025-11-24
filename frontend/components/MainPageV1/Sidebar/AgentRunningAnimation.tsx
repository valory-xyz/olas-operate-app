import { Flex } from 'antd';
import React from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants';

const Dot = styled.div<{ $delay?: string }>`
  width: 4px;
  height: 4px;
  background-color: ${COLOR.PRIMARY};
  border-radius: 50%;
  animation: waveBounce 1.5s infinite ease-in-out;
  animation-delay: ${(props) => props.$delay || '0s'};

  @keyframes waveBounce {
    0% {
      transform: translateY(0);
    }
    /* Peak of the wave */
    25% {
      transform: translateY(-6px);
    }
    /* Return to start */
    50% {
      transform: translateY(0);
    }
    /* Pause phase */
    100% {
      transform: translateY(0);
    }
  }
`;

export const AgentRunningAnimation = () => (
  <Flex justify="center" align="center" gap={4}>
    {[0, 1, 2].map((i) => (
      <Dot key={i} $delay={`${i * 0.15}s`} />
    ))}
  </Flex>
);
