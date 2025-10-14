import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

import { AgentStatus } from './types';

const LINE_HEIGHT = 46;
const CARD_MARGIN = 24;

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

export const Container = styled.div<{
  $status: AgentStatus;
}>`
  display: flex;
  margin: ${CARD_MARGIN}px -${CARD_MARGIN - 1}px -${CARD_MARGIN - 1}px;
  padding: 12px;
  height: ${LINE_HEIGHT}px;
  overflow: hidden;
  border-bottom-right-radius: 16px;
  border-bottom-left-radius: 16px;
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
