import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

import { AgentStatus } from './types';

/**
 * Container and corners styles
 */

const getContainerStylesByStatus = (status: AgentStatus) => {
  switch (status) {
    case 'loading':
    case 'activity-not-ready':
      return `background: ${COLOR.PURPLE_LIGHT_2};`;
    case 'running':
      return `background: linear-gradient(180deg, ${COLOR.PURPLE_LIGHT_3} 80%, ${COLOR.PURPLE_LIGHT_4} 100%);`;
    case 'idle':
      return `background: ${COLOR.BG.SUCCESS.DEFAULT};`;
    default:
      return `background: ${COLOR.GRAY_4};`;
  }
};

// This goes behind the agent info card.
const NEGATIVE_MARGIN = 10;

export const Container = styled.div<{
  $status: AgentStatus;
}>`
  display: flex;
  padding: calc(${NEGATIVE_MARGIN}px + 12px) 12px 12px 12px;
  margin-top: -${NEGATIVE_MARGIN}px;
  height: 56px;
  overflow: hidden;
  border-bottom-right-radius: 16px;
  border-bottom-left-radius: 16px;
  border: 1px solid ${COLOR.WHITE};
  box-shadow:
    0 74px 21px 0 rgba(170, 193, 203, 0),
    0 47px 19px 0 rgba(170, 193, 203, 0.01),
    0 26px 16px 0 rgba(170, 193, 203, 0.05),
    0 12px 12px 0 rgba(170, 193, 203, 0.09),
    0 3px 6px 0 rgba(170, 193, 203, 0.1);
  ${({ $status }) => getContainerStylesByStatus($status)}
`;

/**
 * Text styles
 */

const getTextStylesByStatus = (status: AgentStatus) => {
  switch (status) {
    case 'loading':
    case 'activity-not-ready':
      return `
        color: ${COLOR.TEXT_INFO};
        margin: auto;
      `;
    case 'running':
      return `color: ${COLOR.PURPLE};`;
    case 'idle':
      return `
        color: ${COLOR.TEXT_COLOR.SUCCESS.DEFAULT};
        margin: auto;
      `;
    default:
      return `
        color: ${COLOR.TEXT_LIGHT};
        margin: auto;
      `;
  }
};

export const Text = styled.span<{ $status: AgentStatus }>`
  position: relative;
  z-index: 1;
  ${({ $status }) => getTextStylesByStatus($status)}
`;
