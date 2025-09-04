import styled from 'styled-components';

import { COLOR } from '@/constants/colors';

import { AgentStatus } from '../AgentActivity/types';

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
  border-bottom-right-radius: 10px;
  border-bottom-left-radius: 10px;
  ${({ $status }) => getContainerStylesByStatus($status)}
`;

const getTopCornerStylesByStatus = (status: AgentStatus) => {
  switch (status) {
    case 'loading':
    case 'activity-not-ready':
      return `background: ${COLOR.PURPLE_LIGHT_2};`;
    case 'running':
      return `background: ${COLOR.PURPLE_LIGHT_3};`;
    case 'idle':
      return `background: ${COLOR.BG.SUCCESS.DEFAULT};`;
    default:
      return `background: ${COLOR.GRAY_4};`;
  }
};

const getTopCornerStylesByPosition = (position: 'left' | 'right') =>
  position === 'left'
    ? `left: -${CARD_MARGIN - 1}px;`
    : `right: -${CARD_MARGIN - 1}px;`;

const getTopCornerAfterStylesByPosition = (position: 'left' | 'right') =>
  position === 'left'
    ? `left: 0; border-radius: 0 0 0 20px;`
    : `right: 0; border-radius: 0 0 20px 0;`;

export const TopCorner = styled.div<{
  $position: 'left' | 'right';
  $status: AgentStatus;
}>`
  position: absolute;
  bottom: ${LINE_HEIGHT}px;
  height: ${CARD_MARGIN}px;
  width: ${CARD_MARGIN}px;
  ${({ $status }) => getTopCornerStylesByStatus($status)}
  ${({ $position }) => getTopCornerStylesByPosition($position)}

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    height: ${CARD_MARGIN}px;
    width: ${CARD_MARGIN}px;
    background: ${COLOR.WHITE};
    ${({ $position }) => getTopCornerAfterStylesByPosition($position)}
  }
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

export const CurrentActionText = styled.span`
  color: ${COLOR.PURPLE_2};
`;
